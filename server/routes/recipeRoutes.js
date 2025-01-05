const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");
const axios = require("axios");
const cheerio = require("cheerio");
const cleanAIResponse = require("../cleanAiResponse");

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

    // Prepare the data for AI analysis
    const analysisPrompt = `Analyze these recipe ingredients and provide the analysis as a JSON response. Compare them with available inventory and shopping list items. 

IMPORTANT PARSING RULES:
- Handle mixed fractions (e.g., "1 1/2" should be parsed as 1.5)
- Handle simple fractions (e.g., "1/2" should be parsed as 0.5)
- Handle decimal numbers (e.g., "1.5")
- Convert all fractions to decimal numbers for accurate comparison
- Examples:
  * "1 1/2 cups flour" -> quantity: 1.5
  * "1/2 cup sugar" -> quantity: 0.5
  * "2 1/4 cups milk" -> quantity: 2.25

Recipe Ingredients:
${recipe.ingredients.join("\n")}

Current Inventory:
${inventory
  .map((item) => `${item.quantity} ${item.unit} of ${item.item_name}`)
  .join("\n")}

Shopping List:
${shoppingList
  .map((item) => `${item.quantity} ${item.unit} of ${item.item_name}`)
  .join("\n")}

Analyze each ingredient and return a JSON array where each object has this exact structure:
[
  {
    "original": "original ingredient text",
    "parsed": {
      "quantity": number, // MUST be decimal, convert any fractions
      "unit": "string",
      "name": "string"
    },
    "status": {
      "type": "in-inventory" | "in-shopping-list" | "missing" | "unparseable",
      "hasEnough": boolean,
      "available": {
        "quantity": number,
        "unit": "string",
        "id": number
      } | null,
      "notes": "string explaining the match or mismatch"
    }
  }
]

Make sure to:
1. Convert any fractions in the quantity to decimal numbers
2. Check for exact or suitable matches with inventory items
3. If not in inventory, check for matches in shopping list
4. Include quantity analysis
5. Consider ingredient relationships (e.g., "fresh lemon" is not equivalent to "lemon juice")
6. MAKE ABSOLUTELY SURE THAT YOU ARE CONFIDENT, DONT MIX UP NAMES [example: "cream cheese" is not the same thing as "cheese"]. IF YOU LACK CONFIDENCE, VEER ON THE SIDE OF CAUTION AND DEFAULT TO SETTING "hasEnough" to false.
7. Return the response as a valid JSON array`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert chef and ingredient analyst. For each recipe ingredient provided, you will analyze it and return an entry in a JSON array. Make sure to analyze ALL ingredients provided, not just one.",
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
      // Remove markdown code blocks
      const jsonContent = response.replace(/```json\n|\n```/g, "");

      // Try to parse the cleaned content
      try {
        return JSON.parse(jsonContent);
      } catch (e) {
        console.error("Error parsing cleaned response:", e);
        throw e;
      }
    };

    // In your route handler:
    const content = completion.choices[0].message.content;
    const ingredients = cleanGPTResponse(content);

    // Return recipe with AI-analyzed ingredients
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

// Update in recipeRoutes.js
router.post("/scrape-recipe", authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    // Fetch the webpage content
    const response = await axios.get(url);
    const html = response.data;

    // Load the HTML into cheerio for basic data extraction
    const $ = cheerio.load(html);

    // Extract all text content from the page
    const pageText = $("body").text().replace(/\s+/g, " ").trim();

    // Prepare the prompt for OpenAI to extract recipe information
    const prompt = `Extract recipe information from this webpage content and format it as a JSON object. The webpage is from ${url}.
    
    Return a JSON object with exactly this structure:
    {
      "title": "Recipe title",
      "prepTime": "30 minutes",
      "cookTime": "45 minutes",
      "servings": "4",
      "ingredients": [
        "1 cup ingredient one",
        "2 tablespoons ingredient two"
      ],
      "instructions": [
        "**Preparation:**",
        "First step details",
        "Second step details",
        "**Cooking:**",
        "First cooking step",
        "Second cooking step"
      ],
      "nutritionalInfo": [
        "Calories: 350",
        "Protein: 12g",
        "Carbohydrates: 45g",
        "Fat: 15g"
      ]
    }

    Extract the information from this webpage content and return it as a valid JSON object:
    ${pageText.substring(0, 8000)} // Limit content length for token constraints

    If any information is missing from the webpage, make a reasonable estimate based on similar recipes. Ensure all fields are present in the JSON response.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a recipe extraction expert. Extract recipe details from webpage content and format them as a JSON object following the specified structure exactly.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const recipe = JSON.parse(completion.choices[0].message.content);

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a recipe extraction expert that converts recipe images into structured JSON data.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the complete recipe from this image and return it as a JSON object with this exact structure: title, prepTime, cookTime, servings, ingredients (array), instructions (array), and nutritionalInfo (array). If any information is not visible, make reasonable estimates based on similar recipes. Format instructions with section headers using ** prefix (e.g., **Preparation:**).",
            },
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const recipe = JSON.parse(completion.choices[0].message.content);
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
