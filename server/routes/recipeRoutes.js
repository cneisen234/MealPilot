const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");
const axios = require("axios");
const cheerio = require("cheerio");
const { convertToStandardUnit } = require("../utils/measurementUtils");
const cleanAIResponse = require("../cleanAiResponse");

// Helper to parse ingredient strings
const parseIngredientString = (ingredientStr) => {
  // Match pattern: quantity unit ingredient (ex: "2 cups flour" or "1.5 kg sugar")
  const regex = /^([\d./\s]+)\s+([a-zA-Z]+)\s+(.+)$/;
  const match = ingredientStr.match(regex);

  if (!match) return null;

  return {
    quantity: match[1].trim(),
    unit: match[2].trim(),
    ingredient: match[3].trim(),
  };
};

// Helper to standardize recipe ingredients
const standardizeIngredients = (ingredients) => {
  return ingredients.map((ingredient) => {
    const parsed = parseIngredientString(ingredient);
    if (!parsed) return ingredient;

    try {
      const standardized = convertToStandardUnit(parsed.quantity, parsed.unit);
      return `${standardized.value} ${standardized.unit} ${parsed.ingredient}`;
    } catch (error) {
      // If conversion fails, return original ingredient
      return ingredient;
    }
  });
};

router.post("/create-recipe", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealType } = req.body;

    // Fetch both user data and existing recipes in parallel
    const [
      userQuery,
      recipesQuery,
      inventoryQuery,
      cantHavesQuery,
      mustHavesQuery,
    ] = await Promise.all([
      pool.query("SELECT id, name FROM users WHERE id = $1", [userId]),
      pool.query("SELECT title FROM recipes WHERE user_id = $1", [userId]),
      pool.query(
        "SELECT item_name, quantity, unit FROM inventory WHERE user_id = $1",
        [userId]
      ),
      pool.query("SELECT item FROM cant_haves WHERE user_id = $1", [userId]),
      pool.query("SELECT item FROM must_haves WHERE user_id = $1", [userId]),
    ]);

    const user = userQuery.rows[0];
    const existingRecipes = recipesQuery.rows.map((recipe) => recipe.title);
    const inventory = inventoryQuery.rows;
    const cantHaves = cantHavesQuery.rows.map((row) => row.item);
    const mustHaves = mustHavesQuery.rows.map((row) => row.item);

    // Format inventory for the prompt
    const inventoryList = inventory
      .map((item) => `${item.quantity} ${item.unit} of ${item.item_name}`)
      .join("\n");

    // Prepare the prompt for OpenAI
    let prompt = `Generate a detailed recipe for ${
      user.name
    }. This should be a ${mealType || "meal"} recipe.
    
    INVENTORY CONSIDERATION:
The user has the following ingredients available:
${inventoryList}

Please try to incorporate these ingredients when possible, considering the available quantities. While the recipe doesn't have to use these ingredients, prioritize recipes that make good use of what's available. If a recipe requires more of an ingredient than is available (e.g., recipe needs 2 cups but only 1 cup is available), consider alternative recipes or ingredients.`;

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
- Include complete, detailed sub-steps for each main step
- When possible, note which ingredients were chosen based on inventory availability`;

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

    // Standardize ingredient quantities
    const standardizedIngredients = standardizeIngredients(ingredients);

    await pool.query("BEGIN");

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
        standardizedIngredients,
        instructions,
        nutritionalInfo,
      ]
    );

    const newRecipeId = recipeResult.rows[0].id;

    // Check for meal plan updates
    const mealPlanResult = await pool.query(
      "SELECT meals FROM meal_plans WHERE user_id = $1",
      [userId]
    );

    if (mealPlanResult.rows.length > 0) {
      const meals = mealPlanResult.rows[0].meals;
      let updated = false;

      // Check each day and meal for matching title
      for (const date in meals) {
        for (const mealTime of ["breakfast", "lunch", "dinner"]) {
          if (meals[date][mealTime].title === title) {
            meals[date][mealTime] = {
              title,
              prepTime,
              cookTime,
              servings,
              ingredients: standardizedIngredients,
              instructions,
              nutritionalInfo,
              isNew: false,
              recipeId: newRecipeId,
            };
            updated = true;
          }
        }
      }

      if (updated) {
        await pool.query(
          "UPDATE meal_plans SET meals = $1 WHERE user_id = $2",
          [meals, userId]
        );
      }
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

router.get("/myrecipesinventory/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = req.params.id;

    // Get recipe, inventory, and shopping list data in parallel
    const [recipeResult, inventoryResult, shoppingListResult] =
      await Promise.all([
        pool.query("SELECT * FROM recipes WHERE id = $1 AND user_id = $2", [
          recipeId,
          userId,
        ]),
        pool.query("SELECT * FROM inventory WHERE user_id = $1", [userId]),
        pool.query("SELECT * FROM shopping_list WHERE user_id = $1", [userId]),
      ]);

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    const recipe = recipeResult.rows[0];
    const inventory = inventoryResult.rows;
    const shoppingList = shoppingListResult.rows;

    // Update prompt to emphasize standardized units
    const analysisPrompt = `Analyze these recipe ingredients and provide the analysis as a JSON response. Compare them with available inventory and shopping list items.

IMPORTANT RULES:
1. ALL quantities must be converted to these standardized units:
   - Mass: kilograms
   - Volume: liters
   - Count: units

2. Unit Conversion Rules:
   - Mass conversions: mg, g -> kg
   - Volume conversions: ml, cups, tbsp, tsp -> l
   - Count items remain as units

3. Parsing Rules:
   - Handle mixed fractions (e.g., "1 1/2" becomes 1.5)
   - Handle simple fractions (e.g., "1/2" becomes 0.5)
   - Handle decimal numbers
   - All quantities must be converted to standardized units

Recipe Ingredients:
${recipe.ingredients.join("\n")}

Current Inventory (already in standardized units):
${inventory
  .map((item) => `${item.quantity} ${item.unit} of ${item.item_name}`)
  .join("\n")}

Shopping List (already in standardized units):
${shoppingList
  .map((item) => `${item.quantity} ${item.unit} of ${item.item_name}`)
  .join("\n")}

Analyze each ingredient and return a JSON array where each object has this exact structure:
[
  {
    "original": "original ingredient text",
    "parsed": {
      "quantity": number,  // Must be in standardized units (kilograms, liters, or units)
      "unit": "string",   // Must be "kilograms", "liters", or "units"
      "name": "string"
    },
    "status": {
      "type": "in-inventory" | "in-shopping-list" | "missing" | "unparseable",
      "hasEnough": boolean,
      "available": {
        "quantity": number,
        "unit": "string", // Must be standardized unit
        "id": number
      } | null,
      "notes": "string explaining the match or mismatch"
    }
  }
]

Critical Requirements:
1. ALL quantities must be in standardized units (kilograms, liters, units)
2. Compare quantities only after conversion to same standardized unit
3. Do not compare ingredients with different unit types (e.g., kilograms vs liters)
4. Consider ingredient matches carefully (e.g., "fresh lemon" ≠ "lemon juice")
5. Be conservative with matches - if unsure, mark as "missing"
6. Validate all unit conversions for accuracy`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert chef and ingredient analyst specializing in standardized measurements (kilograms, liters, units). For each recipe ingredient, analyze and convert to standard units before comparison.",
        },
        {
          role: "user",
          content: `Analyze all of these recipe ingredients and return an array of analyses in JSON format:

${analysisPrompt}

Return each ingredient analysis as an array entry. Your response MUST include analysis for ALL provided ingredients, not just one.

For example, if given:
2 cups flour
1/2 cup sugar
3 eggs

Your response should look like:
[
  {
    "original": "2 cups flour",
    "parsed": {
      "quantity": 2,
      "unit": "cups",
      "name": "flour"
    },
    "status": {
      "type": "in-shopping-list",
      "hasEnough": true,
      "available": {
        "quantity": 2,
        "unit": "cups",
        "id": 123
      },
      "notes": "Found in shopping list"
    }
  }
]`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const cleanGPTResponse = (response) => {
      const jsonContent = response.replace(/```json\n|\n```/g, "");
      try {
        const parsed = JSON.parse(jsonContent);

        // Validate and ensure standardized units
        return parsed.map((ingredient) => {
          if (!ingredient.parsed) return ingredient;

          try {
            // Double-check standardization
            const standardized = convertToStandardUnit(
              ingredient.parsed.quantity,
              ingredient.parsed.unit
            );

            return {
              ...ingredient,
              parsed: {
                ...ingredient.parsed,
                quantity: standardized.value,
                unit: standardized.unit,
              },
            };
          } catch (error) {
            console.error(
              `Unit conversion error for ${ingredient.original}:`,
              error
            );
            return {
              original: ingredient.original,
              status: {
                type: "unparseable",
                hasEnough: false,
                notes: "Failed to standardize units",
              },
            };
          }
        });
      } catch (e) {
        console.error("Error parsing cleaned response:", e);
        throw e;
      }
    };

    const ingredients = cleanGPTResponse(completion.choices[0].message.content);

    res.json({
      ...recipe,
      ingredients,
    });
  } catch (error) {
    console.error("Error analyzing recipe:", error);
    res.status(500).json({
      error: "An error occurred while analyzing the recipe",
      details: error.message,
    });
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

router.post("/scrape-recipe", authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    // Fetch the webpage content
    const response = await axios.get(url);
    const html = response.data;

    // Load the HTML into cheerio for basic data extraction
    const $ = cheerio.load(html);
    const pageText = $("body").text().replace(/\s+/g, " ").trim();

    // Update prompt to ensure standardized units
    const prompt = `Extract recipe information from this webpage content and format it as a JSON object. The webpage is from ${url}.
    
    IMPORTANT: All measurements must be converted to these standardized units:
    - Mass measurements in kilograms
    - Volume measurements in liters
    - Count measurements in units

    Return a JSON object with exactly this structure:
    {
      "title": "Recipe title",
      "prepTime": "30 minutes",
      "cookTime": "45 minutes",
      "servings": "4",
      "ingredients": [
        "0.5 kilograms flour",
        "0.25 liters milk"
      ],
      "instructions": [
        "**Preparation:**",
        "First step details",
        "**Cooking:**",
        "Cooking steps"
      ],
      "nutritionalInfo": [
        "Calories: 350",
        "Protein: 12g"
      ]
    }

    Convert ALL ingredient quantities to standardized units (kilograms, liters, units) before including them in the response.

        Extract the information from this webpage content and return it as a valid JSON object:
    ${pageText.substring(0, 8000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a recipe extraction expert that always uses standardized measurements (kilograms, liters, units).",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const recipe = JSON.parse(completion.choices[0].message.content);

    // Double-check ingredient standardization
    recipe.ingredients = recipe.ingredients.map((ingredient) => {
      try {
        const parsed = parseIngredientString(ingredient);
        if (!parsed) return ingredient;

        const standardized = convertToStandardUnit(
          parsed.quantity,
          parsed.unit
        );
        return `${standardized.value} ${standardized.unit} ${parsed.ingredient}`;
      } catch (error) {
        console.error(`Unit conversion error for ${ingredient}:`, error);
        return ingredient;
      }
    });

    res.json({ recipe });
  } catch (error) {
    console.error("Error scraping recipe:", error);
    res.status(500).json({
      message: "Error extracting recipe information",
      error: error.message,
    });
  }
});

router.post("/ocr-recipe", authMiddleware, async (req, res) => {
  try {
    const { imageData } = req.body;

    const prompt = `Extract the complete recipe from this image and return it as a JSON object.

    IMPORTANT: All measurements must be converted to these standardized units:
    - Mass measurements in kilograms
    - Volume measurements in liters
    - Count measurements in units

    Return the recipe in this exact structure:
    {
      "title": "Recipe title",
      "prepTime": "time",
      "cookTime": "time",
      "servings": "number",
      "ingredients": [
        "0.5 kg flour",
        "0.25 l milk"
      ],
      "instructions": ["steps"],
      "nutritionalInfo": ["info"]
    }

    Ensure ALL ingredient quantities are converted to standardized units (kilograms, liters, units) before including them in the response.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a recipe extraction expert that always uses standardized measurements (kilograms, liters, units).",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageData },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const recipe = JSON.parse(completion.choices[0].message.content);

    // Double-check ingredient standardization
    recipe.ingredients = recipe.ingredients.map((ingredient) => {
      try {
        const parsed = parseIngredientString(ingredient);
        if (!parsed) return ingredient;

        const standardized = convertToStandardUnit(
          parsed.quantity,
          parsed.unit
        );
        return `${standardized.value} ${standardized.unit} ${parsed.ingredient}`;
      } catch (error) {
        console.error(`Unit conversion error for ${ingredient}:`, error);
        return ingredient;
      }
    });

    res.json({ recipe });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({
      message: "Error extracting recipe from image",
      error: error.message,
    });
  }
});

module.exports = router;
