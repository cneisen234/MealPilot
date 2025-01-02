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

    const result = await pool.query(
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

    res.status(201).json({
      message: "Recipe saved successfully",
      recipeId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error saving recipe:", error);
    res
      .status(500)
      .json({ error: "An error occurred while saving the recipe" });
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
    const recipeId = req.params.id;
    const {
      title,
      prepTime,
      cookTime,
      servings,
      ingredients,
      instructions,
      nutritionalInfo,
    } = req.body;

    // Verify recipe belongs to user
    const checkRecipe = await pool.query(
      "SELECT id FROM recipes WHERE id = $1 AND user_id = $2",
      [recipeId, userId]
    );

    if (checkRecipe.rows.length === 0) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Update recipe
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

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating recipe:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the recipe" });
  }
});

router.delete("/myrecipes/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;

    // Verify recipe belongs to user
    const checkRecipe = await pool.query(
      "SELECT id FROM recipes WHERE id = $1 AND user_id = $2",
      [recipeId, userId]
    );

    if (checkRecipe.rows.length === 0) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Delete recipe
    await pool.query("DELETE FROM recipes WHERE id = $1", [recipeId]);

    res.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the recipe" });
  }
});

module.exports = router;
