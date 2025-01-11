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
function formatRecipeForMealPlan(recipe, isGlobal = false) {
  return {
    title: recipe.title,
    isNew: false,
    recipeId: isGlobal ? null : recipe.id,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    nutritionalInfo: recipe.nutritional_info,
  };
}

router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query("BEGIN");

    // Delete existing meal plan
    await pool.query("DELETE FROM meal_plans WHERE user_id = $1", [userId]);

    // Get saved recipes and restrictions
    const [
      savedRecipesResult,
      cantHaves,
      mustHaves,
      tastePreferences,
      dietaryGoals,
      cuisinePreferences,
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

    const savedRecipes = savedRecipesResult.rows;
    const restrictions = {
      cantHaves: cantHaves.rows.map((row) => row.item),
      mustHaves: mustHaves.rows.map((row) => row.item),
      tastePreferences: tastePreferences.rows.map((row) => row.item),
      dietaryGoals: dietaryGoals.rows.map((row) => row.item),
      cuisinePreferences: cuisinePreferences.rows.map((row) => row.item),
    };

    // Generate array of next 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + i + 1);
      return date.toISOString().split("T")[0];
    });

    // Get matching recipes from global_recipes
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const matchingRecipesQuery = await pool.query(
      `SELECT * FROM global_recipes 
       WHERE last_queried_at < $1
       AND NOT ($2::text[] && cant_haves)
       AND must_haves @> $3::text[]
       AND taste_preferences && $4::text[]
       AND dietary_goals && $5::text[]
       AND cuisine_preferences && $6::text[]
       AND title NOT IN (SELECT title FROM recipes WHERE user_id = $7)`,
      [
        threeDaysAgo.toISOString(),
        restrictions.cantHaves,
        restrictions.mustHaves,
        restrictions.tastePreferences,
        restrictions.dietaryGoals,
        restrictions.cuisinePreferences,
        userId,
      ]
    );

    const mealPlan = {};
    const existingMeals = [];

    // Generate meals for each day
    for (const date of days) {
      const dayMeals = await generateDayMeals(
        date,
        existingMeals,
        savedRecipes,
        restrictions,
        matchingRecipesQuery.rows
      );

      // Add these meals to our tracking array
      existingMeals.push(
        dayMeals.breakfast.title,
        dayMeals.lunch.title,
        dayMeals.dinner.title
      );

      // Add to meal plan
      mealPlan[date] = dayMeals;

      // Save progress to database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await pool.query(
        `INSERT INTO meal_plans (user_id, expires_at, meals) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) 
         DO UPDATE SET meals = $3, expires_at = $2`,
        [userId, expiresAt, mealPlan]
      );
    }

    await pool.query("COMMIT");

    // Get final meal plan
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

async function generateDayMeals(
  date,
  existingMeals,
  savedRecipes,
  restrictions,
  globalRecipes
) {
  // Define valid meal types for each category
  const VALID_MEAL_TYPES = {
    breakfast: ["breakfast", "brunch"],
    lunch: ["brunch", "lunch", "main course", "meal"],
    dinner: ["dinner", "main course", "meal"],
  };

  const EXCLUDED_MEAL_TYPES = [
    "appetizer",
    "side dish",
    "salad",
    "soup",
    "dessert",
    "snack",
  ];

  // Try to fill meals with saved and global recipes first
  const dayMeals = {
    breakfast: null,
    lunch: null,
    dinner: null,
  };

  const usedRecipeIds = new Set();
  const usedTitles = new Set([...existingMeals]); // Initialize with existing meals

  for (const mealType of ["breakfast", "lunch", "dinner"]) {
    // 30% chance to use saved recipe
    if (Math.random() < 0.3) {
      const availableSaved = savedRecipes.filter((recipe) => {
        // First check if title is already used
        if (usedTitles.has(recipe.title)) return false;

        // If recipe has no meal type, only allow for lunch and dinner (more flexible)
        if (
          !recipe.meal_type &&
          (mealType === "lunch" || mealType === "dinner")
        )
          return true;

        // If recipe has meal type, check if it's not in excluded list and is valid for current meal
        if (recipe.meal_type) {
          const recipeMealType = recipe.meal_type.toLowerCase();
          return (
            !EXCLUDED_MEAL_TYPES.includes(recipeMealType) &&
            VALID_MEAL_TYPES[mealType].includes(recipeMealType)
          );
        }

        return false;
      });

      if (availableSaved.length > 0) {
        const recipe =
          availableSaved[Math.floor(Math.random() * availableSaved.length)];
        dayMeals[mealType] = formatRecipeForMealPlan(recipe);
        usedTitles.add(recipe.title);
        continue;
      }
    }

    // Try global recipe
    const availableGlobal = globalRecipes.filter((recipe) => {
      // First check if title is already used or recipe ID is used
      if (usedTitles.has(recipe.title) || usedRecipeIds.has(recipe.id))
        return false;

      // If recipe has no meal type, only allow for lunch and dinner
      if (!recipe.meal_type && (mealType === "lunch" || mealType === "dinner"))
        return true;

      // If recipe has meal type, check if it's not in excluded list and is valid for current meal
      if (recipe.meal_type) {
        const recipeMealType = recipe.meal_type.toLowerCase();
        return (
          !EXCLUDED_MEAL_TYPES.includes(recipeMealType) &&
          VALID_MEAL_TYPES[mealType].includes(recipeMealType)
        );
      }

      return false;
    });

    if (availableGlobal.length > 0) {
      const recipe =
        availableGlobal[Math.floor(Math.random() * availableGlobal.length)];
      dayMeals[mealType] = formatRecipeForMealPlan(recipe, true);
      usedRecipeIds.add(recipe.id);
      usedTitles.add(recipe.title);

      // Update last_queried_at
      await pool.query(
        "UPDATE global_recipes SET last_queried_at = NOW() WHERE id = $1",
        [recipe.id]
      );
      continue;
    }
  }

  // Only generate missing meals with AI
  const missingMeals = Object.keys(dayMeals).filter((meal) => !dayMeals[meal]);

  if (missingMeals.length > 0) {
    const prompt = `Generate meals for a single day (${date}) following these rules:
  - Do not duplicate any of these existing meals: ${JSON.stringify(
    Array.from(usedTitles)
  )}
  - Use a mix of saved recipes (${JSON.stringify(savedRecipes)}) and new ones
  - Only generate the following meals: ${missingMeals.join(", ")}
  - Make sure each meal is appropriate for its meal type. For example:
    * Breakfast should be breakfast foods (eggs, cereal, toast, etc.)
    * Lunch should be lunch appropriate (sandwiches, salads, light meals)
    * Dinner should be dinner appropriate (fuller meals, no breakfast foods)
  ${
    (restrictions.cantHaves.length > 0 || restrictions.mustHaves.length > 0) &&
    "- IMPORTANT THESE DIETARY RESTRICTIONS MUST BE FOLLOWED UNDER ANY AND ALL CIRCUMSTANCES: "
  }
      ${
        restrictions.cantHaves.length > 0 &&
        "Can't have: " + restrictions.cantHaves.join(", ")
      }
      ${
        restrictions.mustHaves.length > 0 &&
        "Must have: " + restrictions.mustHaves.join(", ")
      }
      ${
        (restrictions.tastePreferences.length > 0 ||
          restrictions.dietaryGoals.length > 0 ||
          restrictions.cuisinePreferences.length > 0) &&
        "- Make sure the generated recipe follows these personal preference guidelines:"
      }
      ${
        restrictions.tastePreferences.length > 0 &&
        "Taste Preferences: " + restrictions.tastePreferences.join(", ")
      }
        ${
          restrictions.dietaryGoals.length > 0 &&
          "Dietary Goals: " + restrictions.dietaryGoals.join(", ")
        }
          ${
            restrictions.cuisinePreferences.length > 0 &&
            "Cuisine Preferences: " + restrictions.cuisinePreferences.join(", ")
          }

  Return a JSON object with this exact structure:
  {
    ${missingMeals
      .map(
        (meal) => `"${meal}": {
      "title": "",
      "isNew": true,
      "recipeId": null,
      "prepTime": "",
      "cookTime": "",
      "servings": "",
      "ingredients": [],
      "instructions": [],
      "nutritionalInfo": []
    }`
      )
      .join(",\n    ")}
  }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a JSON-only meal planning assistant. Return complete, valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const generatedMeals = JSON.parse(completion.choices[0].message.content);

    // Save new recipes to global_recipes
    for (const [mealType, meal] of Object.entries(generatedMeals)) {
      const newRecipeId = await pool.query(
        `INSERT INTO global_recipes (
          title, prep_time, cook_time, servings, 
          ingredients, instructions, nutritional_info,
          cant_haves, must_haves, taste_preferences, 
          dietary_goals, cuisine_preferences, meal_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          meal.title,
          meal.prepTime,
          meal.cookTime,
          meal.servings,
          meal.ingredients,
          meal.instructions,
          meal.nutritionalInfo,
          restrictions.cantHaves,
          restrictions.mustHaves,
          restrictions.tastePreferences,
          restrictions.dietaryGoals,
          restrictions.cuisinePreferences,
          mealType,
        ]
      );

      dayMeals[mealType] = meal;
    }
  }

  return dayMeals;
}

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
