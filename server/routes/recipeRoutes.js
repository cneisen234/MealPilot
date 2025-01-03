const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");
const cleanAIResponse = require("../cleanAiResponse");

router.post("/create-recipe", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealType } = req.body;

    // Fetch both user data and existing recipes in parallel
    const [userQuery, recipesQuery] = await Promise.all([
      pool.query("SELECT id, name FROM users WHERE id = $1", [userId]),
      pool.query("SELECT title FROM recipes WHERE user_id = $1", [userId]),
    ]);

    const user = userQuery.rows[0];
    const existingRecipes = recipesQuery.rows.map((recipe) => recipe.title);

    // Fetch dietary restrictions
    const cantHavesQuery = await pool.query(
      "SELECT item FROM cant_haves WHERE user_id = $1",
      [userId]
    );
    const cantHaves = cantHavesQuery.rows.map((row) => row.item);

    // Fetch required ingredients
    const mustHavesQuery = await pool.query(
      "SELECT item FROM must_haves WHERE user_id = $1",
      [userId]
    );
    const mustHaves = mustHavesQuery.rows.map((row) => row.item);

    // Prepare the prompt for OpenAI
    let prompt = `Generate a detailed recipe for ${
      user.name
    }. This should be a ${mealType || "meal"} recipe.`;

    // Add dietary restrictions if any
    if (cantHaves.length > 0) {
      prompt += `\nThe recipe MUST NOT include the following ingredients under any circumstances: ${cantHaves.join(
        ", "
      )}.`;
    }

    // Add required ingredients if any
    if (mustHaves.length > 0) {
      prompt += `\nThe recipe MUST include the following ingredients: ${mustHaves.join(
        ", "
      )}.`;
    }

    if (existingRecipes.length > 0) {
      prompt += `\nIMPORTANT: The recipe must be unique and MUST NOT be any of these existing recipes: ${existingRecipes.join(
        ", "
      )}.`;
    }

    prompt += `\nPlease format the recipe exactly as follows:

Name: [Recipe Name]

Prep Time: [Time in minutes]
Cook Time: [Time in minutes]
Servings: [Number]

Ingredients:
[List each ingredient on a new line with measurements]

Instructions:
**[Main Step Title]:**
[Sub-steps with details]
[Additional sub-steps if needed]
**[Next Main Step Title]:**
[Sub-steps with details]
[Continue pattern for all steps]

Nutritional Information:
Calories: [number]
Protein: [number]g
Carbohydrates: [number]g
Fat: [number]g
[Any additional nutritional info]

Follow these formatting rules exactly:
- Main steps must be surrounded by double stars (**)
- Sub-steps should be listed directly below their main step
- Use standard measurements (cups, tablespoons, teaspoons, etc.)
- List exact quantities for all ingredients
- Include complete, detailed sub-steps for each main step`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const recipeText = completion.choices[0].message.content;
    const cleanedRecommendation = cleanAIResponse(recipeText);

    res.json({ recipe: cleanedRecommendation });
  } catch (error) {
    console.error("Error generating recipe:", error);
    res
      .status(500)
      .json({ error: "An error occurred while generating the recipe" });
  }
});

router.post("/save-recipe", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      prepTime,
      cookTime,
      servings,
      ingredients,
      instructions,
      nutritionalInfo,
    } = req.body;

    // Start transaction
    await pool.query("BEGIN");

    // First, save the recipe and get its ID
    const recipeResult = await pool.query(
      `INSERT INTO recipes 
        (user_id, title, prep_time, cook_time, servings, ingredients, instructions, nutritional_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        title,
        prepTime,
        cookTime,
        servings,
        ingredients,
        instructions,
        nutritionalInfo,
      ]
    );

    const newRecipeId = recipeResult.rows[0].id;

    // Check for meal plan
    const mealPlanResult = await pool.query(
      "SELECT meals FROM meal_plans WHERE user_id = $1",
      [userId]
    );

    // If meal plan exists, look for matching recipe titles
    if (mealPlanResult.rows.length > 0) {
      const meals = mealPlanResult.rows[0].meals;

      // Check each day and meal for matching title
      for (const date in meals) {
        for (const mealTime of ["breakfast", "lunch", "dinner"]) {
          if (meals[date][mealTime].title === title) {
            // Update with saved recipe details
            meals[date][mealTime] = {
              title,
              prepTime,
              cookTime,
              servings,
              ingredients,
              instructions,
              nutritionalInfo,
              isNew: false,
              recipeId: newRecipeId,
            };
          }
        }
      }

      // Update meal plan
      await pool.query("UPDATE meal_plans SET meals = $1 WHERE user_id = $2", [
        meals,
        userId,
      ]);
    }

    await pool.query("COMMIT");

    res.status(201).json({
      message: "Recipe saved successfully",
      recipeId: newRecipeId,
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error saving recipe:", error);
    res.status(500).json({
      message: "Error saving recipe",
      error: error.message,
    });
  }
});

router.get("/myrecipes", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM recipes 
       WHERE user_id = $1 
       ORDER BY id DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "An error occurred while fetching recipes" });
  }
});

router.get("/myrecipes/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM recipes 
       WHERE id = $1 AND user_id = $2`,
      [recipeId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the recipe" });
  }
});

router.put("/myrecipes/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = parseInt(req.params.id);
    const {
      title,
      prepTime,
      cookTime,
      servings,
      ingredients,
      instructions,
      nutritionalInfo,
    } = req.body;

    // Start transaction
    await pool.query("BEGIN");

    // Check for meal plan
    const mealPlanResult = await pool.query(
      "SELECT meals FROM meal_plans WHERE user_id = $1",
      [userId]
    );

    // If meal plan exists, update any matching recipes
    if (mealPlanResult.rows.length > 0) {
      const meals = mealPlanResult.rows[0].meals;

      // Check each day and meal for the recipe ID
      for (const date in meals) {
        for (const mealTime of ["breakfast", "lunch", "dinner"]) {
          if (meals[date][mealTime].recipeId === recipeId) {
            // Update recipe details while preserving isNew and recipeId
            meals[date][mealTime] = {
              ...meals[date][mealTime],
              title,
              prepTime,
              cookTime,
              servings,
              ingredients,
              instructions,
              nutritionalInfo,
              // isNew and recipeId remain unchanged
            };
          }
        }
      }

      // Update meal plan
      await pool.query("UPDATE meal_plans SET meals = $1 WHERE user_id = $2", [
        meals,
        userId,
      ]);
    }

    // Update the recipe
    const result = await pool.query(
      `UPDATE recipes 
       SET title = $1, 
           prep_time = $2, 
           cook_time = $3, 
           servings = $4, 
           ingredients = $5, 
           instructions = $6, 
           nutritional_info = $7
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        title,
        prepTime,
        cookTime,
        servings,
        ingredients,
        instructions,
        nutritionalInfo,
        recipeId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Recipe not found" });
    }

    await pool.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error updating recipe:", error);
    res.status(500).json({
      message: "Error updating recipe",
      error: error.message,
    });
  }
});

// recipeRoutes.js
router.delete("/myrecipes/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = parseInt(req.params.id);

    // Start a transaction
    await pool.query("BEGIN");

    // Check if meal plan exists
    const mealPlanResult = await pool.query(
      "SELECT meals FROM meal_plans WHERE user_id = $1",
      [userId]
    );

    // If meal plan exists, process it
    if (mealPlanResult.rows.length > 0) {
      const meals = mealPlanResult.rows[0].meals; // meals is already a JS object

      // Check each day and meal for the recipe ID
      for (const date in meals) {
        for (const mealTime of ["breakfast", "lunch", "dinner"]) {
          if (meals[date][mealTime].recipeId === recipeId) {
            // Update the meal to be a new recipe instead of saved
            meals[date][mealTime].recipeId = null;
            meals[date][mealTime].isNew = true;
          }
        }
      }

      // Update the meal plan with modified meals
      await pool.query(
        "UPDATE meal_plans SET meals = $1 WHERE user_id = $2",
        [meals, userId] // PostgreSQL will handle the JSON conversion
      );
    }

    // Delete the recipe
    const deleteResult = await pool.query(
      "DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id",
      [recipeId, userId]
    );

    if (deleteResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Commit the transaction
    await pool.query("COMMIT");

    res.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error deleting recipe:", error);
    res.status(500).json({
      message: "Error deleting recipe",
      error: error.message,
    });
  }
});

module.exports = router;
