const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");

// Get current meal plan
router.get("/current", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete expired meal plans
    await pool.query(
      "DELETE FROM meal_plans WHERE user_id = $1 AND expires_at < NOW()",
      [userId]
    );

    // Get current meal plan
    const result = await pool.query(
      "SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ exists: false });
    }

    res.json({ exists: true, mealPlan: result.rows[0] });
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper function to format recipe into meal plan format
function formatRecipeForMealPlan(recipe, isGlobal) {
  return {
    title: recipe.title,
    isNew: isGlobal,
    recipeId: isGlobal ? null : recipe.id,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    nutritionalInfo: recipe.nutritional_info,
    mealType: recipe.meal_type,
  };
}

router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query("BEGIN");
    await pool.query("DELETE FROM meal_plans WHERE user_id = $1", [userId]);

    // Get all restrictions
    const [
      savedRecipes,
      cantHavesResult,
      mustHavesResult,
      tastePrefsResult,
      dietaryGoalsResult,
      cuisinePrefsResult,
    ] = await Promise.all([
      pool.query("SELECT * FROM recipes WHERE user_id = $1", [userId]),
      pool.query("SELECT item FROM cant_haves WHERE user_id = $1", [userId]),
      pool.query("SELECT item FROM must_haves WHERE user_id = $1", [userId]),
      pool.query("SELECT item FROM taste_preferences WHERE user_id = $1", [
        userId,
      ]),
      pool.query("SELECT item FROM dietary_goals WHERE user_id = $1", [userId]),
      pool.query("SELECT item FROM cuisine_preferences WHERE user_id = $1", [
        userId,
      ]),
    ]);

    // Extract restrictions arrays
    const restrictions = {
      cantHaves: cantHavesResult.rows.map((row) => row.item),
      mustHaves: mustHavesResult.rows.map((row) => row.item),
      tastePreferences: tastePrefsResult.rows.map((row) => row.item),
      dietaryGoals: dietaryGoalsResult.rows.map((row) => row.item),
      cuisinePreferences: cuisinePrefsResult.rows.map((row) => row.item),
    };

    // Now get global recipes with modified query
    const globalRecipesResult = await pool.query(
      `SELECT title, prep_time, cook_time, servings, ingredients, instructions, nutritional_info, created_at, last_queried_at, cant_haves, must_haves, taste_preferences, dietary_goals, cuisine_preferences, meal_type
FROM global_recipes
WHERE title NOT IN (SELECT title FROM recipes)
ORDER BY RANDOM();
`
    );

    function areArraysEqual(arr1, arr2) {
      if (arr1.length !== arr2.length) return false;
      return (
        arr1.every((item) => arr2.includes(item)) &&
        arr2.every((item) => arr1.includes(item))
      );
    }

    // Function to filter recipes
    function filterRecipes(recipes) {
      return recipes.filter((recipe) => {
        // Check for cant_haves
        const cantHavesMatch =
          restrictions.cantHaves.length === 0 ||
          areArraysEqual(recipe.cant_haves, restrictions.cantHaves);

        // Check for must_haves
        const mustHavesMatch =
          restrictions.mustHaves.length === 0 ||
          areArraysEqual(recipe.must_haves, restrictions.mustHaves);

        // Check for taste_preferences
        const tastePreferencesMatch =
          restrictions.tastePreferences.length === 0 ||
          areArraysEqual(
            recipe.taste_preferences,
            restrictions.tastePreferences
          );

        // Check for dietary_goals
        const dietaryGoalsMatch =
          restrictions.dietaryGoals.length === 0 ||
          areArraysEqual(recipe.dietary_goals, restrictions.dietaryGoals);

        // Check for cuisine_preferences
        const cuisinePreferencesMatch =
          restrictions.cuisinePreferences.length === 0 ||
          areArraysEqual(
            recipe.cuisine_preferences,
            restrictions.cuisinePreferences
          );

        // Only include recipes where all conditions match
        return (
          cantHavesMatch &&
          mustHavesMatch &&
          tastePreferencesMatch &&
          dietaryGoalsMatch &&
          cuisinePreferencesMatch
        );
      });
    }

    const filteredRecipes = filterRecipes(globalRecipesResult.rows);

    // Initialize arrays for first and second uses
    const firstUse = {
      breakfast: [],
      lunch: [],
      dinner: [],
    };

    // Combine and shuffle all recipes
    const allRecipes = [...savedRecipes.rows, ...filteredRecipes].sort(
      () => Math.random() - 0.5
    );

    // Define meal type rules
    const VALID_MEAL_TYPES = {
      breakfast: ["breakfast", "brunch"],
      lunch: ["brunch", "lunch", "main course", "meal"],
      dinner: ["dinner", "main course", "meal"],
    };

    // Sort recipes into first use arrays
    allRecipes.forEach((recipe) => {
      const mealType = recipe.meal_type?.toLowerCase();

      if (!mealType || mealType === "meal" || mealType === "main course") {
        // If no specific meal type or generic, add to lunch and dinner
        firstUse.lunch.push(recipe);
        firstUse.dinner.push(recipe);
      } else if (mealType === "brunch") {
        // Brunch can be breakfast or lunch
        firstUse.breakfast.push(recipe);
        firstUse.lunch.push(recipe);
      } else {
        // Add to specific meal type if valid
        Object.entries(VALID_MEAL_TYPES).forEach(([type, validTypes]) => {
          if (validTypes.includes(mealType)) {
            firstUse[type].push(recipe);
          }
        });
      }
    });

    // Generate array of next 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + i + 1);
      return date.toISOString().split("T")[0];
    });

    const mealPlan = {};
    let completeDays = 0;

    // Fill meal plan using first use arrays
    for (const date of days) {
      const dayMeals = {
        breakfast: null,
        lunch: null,
        dinner: null,
      };

      let dayComplete = true;

      // Try to fill each meal type
      for (const mealType of Object.keys(dayMeals)) {
        if (firstUse[mealType].length > 0) {
          // Get and remove first recipe from array
          const recipe = firstUse[mealType].shift();
          // Add to meal plan
          dayMeals[mealType] = formatRecipeForMealPlan(recipe, !recipe.id);
        } else {
          dayComplete = false;
          continue;
        }
      }

      if (dayComplete) {
        mealPlan[date] = dayMeals;
        completeDays++;
      } else {
        break;
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + completeDays);

    await pool.query(
      `INSERT INTO meal_plans (user_id, expires_at, meals) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) 
         DO UPDATE SET meals = $3, expires_at = $2`,
      [userId, expiresAt, mealPlan]
    );

    await pool.query("COMMIT");

    const result = await pool.query(
      "SELECT * FROM meal_plans WHERE user_id = $1",
      [userId]
    );

    res.json({ mealPlan: result.rows[0] });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error generating meal plan:", error);
    res.status(500).json({
      message: "Error generating meal plan",
      error: error.message,
    });
  }
});

router.post("/update", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, mealType, recipeId } = req.body;

    // First verify the recipe exists and belongs to the user
    const recipeResult = await pool.query(
      "SELECT * FROM recipes WHERE id = $1 AND user_id = $2",
      [recipeId, userId]
    );

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    const recipe = recipeResult.rows[0];

    // Get current meal plan
    const mealPlanResult = await pool.query(
      "SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (mealPlanResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No meal plan found",
      });
    }

    const currentMealPlan = mealPlanResult.rows[0];
    const updatedMeals = { ...currentMealPlan.meals };

    // Update the specific meal for the given date
    updatedMeals[date][mealType.toLowerCase()] = {
      title: recipe.title,
      isNew: false,
      recipeId: recipe.id,
    };

    // Update the meal plan in the database
    await pool.query(
      "UPDATE meal_plans SET meals = $1 WHERE user_id = $2 AND id = $3",
      [updatedMeals, userId, currentMealPlan.id]
    );

    res.json({
      success: true,
      recipe: {
        id: recipe.id,
        title: recipe.title,
      },
    });
  } catch (error) {
    console.error("Error updating meal plan:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
