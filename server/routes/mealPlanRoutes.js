const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const cleanAIResponse = require("../cleanAiResponse");
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
      pool.query(
        `SELECT * FROM recipes 
   WHERE user_id = $1 
   AND (meal_type IS NULL 
    OR LOWER(meal_type) IN ('breakfast', 'brunch', 'lunch', 'dinner', 'main course', 'meal'))`,
        [userId]
      ),
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
      `SELECT title, 
    prep_time, 
    cook_time, 
    servings, 
    ingredients, 
    instructions, 
    nutritional_info, 
    created_at, 
    last_queried_at, 
    cant_haves, 
    must_haves, 
    taste_preferences, 
    dietary_goals, 
    cuisine_preferences, 
    meal_type FROM global_recipes 
  WHERE 
    ($1::text[] = '{}' OR (cant_haves @> $1::text[] AND array_length($1::text[], 1) = array_length(ARRAY(
      SELECT DISTINCT unnest($1::text[])
      INTERSECT
      SELECT DISTINCT unnest(cant_haves)
    ), 1)))

    AND ($2::text[] = '{}' OR (must_haves @> $2::text[] AND array_length($2::text[], 1) = array_length(ARRAY(
      SELECT DISTINCT unnest($2::text[])
      INTERSECT
      SELECT DISTINCT unnest(must_haves)
    ), 1)))

    AND title NOT IN (SELECT title FROM recipes)
  ORDER BY RANDOM();`,
      [
        restrictions.cantHaves, // $1: array of cant_haves restrictions
        restrictions.mustHaves, // $2: array of must_haves restrictions
      ]
    );

    // Initialize arrays for first and second uses
    const firstUse = {
      breakfast: [],
      lunch: [],
      dinner: [],
    };

    // Combine and shuffle all recipes
    const allRecipes = [...savedRecipes.rows, ...globalRecipesResult.rows].sort(
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

    // Check what meal types we're missing
    const missingMealTypes = [];
    if (firstUse.breakfast.length === 0) missingMealTypes.push("breakfast");
    if (firstUse.lunch.length === 0) missingMealTypes.push("lunch");
    if (firstUse.dinner.length === 0) missingMealTypes.push("dinner");

    // Generate missing recipes if needed
    if (missingMealTypes.length > 0) {
      for (const mealType of missingMealTypes) {
        // Create prompt
        let prompt = `Generate a detailed recipe for ${mealType}.\n\n`;

        if (restrictions.cantHaves.length > 0) {
          prompt += `The recipe MUST NOT include: ${restrictions.cantHaves.join(
            ", "
          )}.\n`;
        }
        if (restrictions.mustHaves.length > 0) {
          prompt += `The recipe MUST include: ${restrictions.mustHaves.join(
            ", "
          )}.\n`;
        }
        if (restrictions.tastePreferences.length > 0) {
          prompt += `Taste preferences: ${restrictions.tastePreferences.join(
            ", "
          )}.\n`;
        }
        if (restrictions.dietaryGoals.length > 0) {
          prompt += `Dietary goals: ${restrictions.dietaryGoals.join(", ")}.\n`;
        }
        if (restrictions.cuisinePreferences.length > 0) {
          prompt += `Cuisine preferences: ${restrictions.cuisinePreferences.join(
            ", "
          )}.\n`;
        }

        prompt += `\nFormat as follows:
Name: [Recipe Name]
Prep Time: [Time in minutes]
Cook Time: [Time in minutes]
Servings: [Number]

Ingredients:
[List each ingredient with measurements]

Instructions:
**[Main Step Title]:**
[Sub-steps]
**[Next Main Step Title]:**
[Sub-steps]

Nutritional Information:
[Details]`;

        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
            temperature: 0.7,
          });

          const recipeText = completion.choices[0].message.content;
          const recipe = cleanAIResponse(recipeText);
          recipe.mealType = mealType;

          // Save to global_recipes
          await pool.query(
            `INSERT INTO global_recipes (
              title, prep_time, cook_time, servings, 
              ingredients, instructions, nutritional_info,
              cant_haves, must_haves, taste_preferences, 
              dietary_goals, cuisine_preferences, meal_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              recipe.title,
              recipe.prepTime,
              recipe.cookTime,
              recipe.servings,
              recipe.ingredients,
              recipe.instructions,
              recipe.nutritionalInfo,
              restrictions.cantHaves,
              restrictions.mustHaves,
              restrictions.tastePreferences,
              restrictions.dietaryGoals,
              restrictions.cuisinePreferences,
              mealType,
            ]
          );

          // Add to firstUse array
          firstUse[mealType].push({
            title: recipe.title,
            prep_time: recipe.prepTime,
            cook_time: recipe.cookTime,
            servings: recipe.servings,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            nutritional_info: recipe.nutritionalInfo,
            meal_type: recipe.mealType,
          });
        } catch (error) {
          console.error(`Error generating recipe for ${mealType}:`, error);
          throw error;
        }
      }
    }

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
