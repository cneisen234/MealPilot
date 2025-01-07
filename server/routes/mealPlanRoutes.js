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

// Generate new meal plan
router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

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

    // Track all meals to prevent duplicates
    const existingMeals = [];
    const mealPlan = {};

    // Generate meals for each day
    for (const date of days) {
      const dayMeals = await generateDayMeals(
        date,
        existingMeals,
        savedRecipesResult.rows,
        restrictions
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

    // Get final meal plan
    const result = await pool.query(
      "SELECT * FROM meal_plans WHERE user_id = $1",
      [userId]
    );

    res.json({ mealPlan: result.rows[0] });
  } catch (error) {
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
  restrictions
) {
  const prompt = `Generate meals for a single day (${date}) following these rules:
  - Do not duplicate any of these existing meals: ${JSON.stringify(
    existingMeals
  )}
  - Use a mix of saved recipes (${JSON.stringify(savedRecipes)}) and new ones
  - Make sure you generate a meal that fits with the meal type. For example if you generate a meal for lunch, it should be fitting for what someone would make for lunch (dont fit a desert in there!)
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
    "breakfast": {
      "title": "",
      "isNew": true,
      "recipeId": null,
      "prepTime": "",
      "cookTime": "",
      "servings": "",
      "ingredients": [],
      "instructions": [],
      "nutritionalInfo": []
    },
    "lunch": {
      "title": "",
      "isNew": true,
      "recipeId": null,
      "prepTime": "",
      "cookTime": "",
      "servings": "",
      "ingredients": [],
      "instructions": [],
      "nutritionalInfo": []
    },
    "dinner": {
      "title": "",
      "isNew": true,
      "recipeId": null,
      "prepTime": "",
      "cookTime": "",
      "servings": "",
      "ingredients": [],
      "instructions": [],
      "nutritionalInfo": []
    }
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

  return JSON.parse(completion.choices[0].message.content);
}

module.exports = router;
