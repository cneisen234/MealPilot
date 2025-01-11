const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");
const axios = require("axios");
const cheerio = require("cheerio");
const cleanAIResponse = require("../cleanAiResponse");

// Helper to parse ingredient strings
const parseIngredientString = (ingredientStr) => {
  // Match pattern: quantity ingredient (ex: "2 flour" or "1.5 sugar")
  const regex = /^([\d./\s]+)\s+([a-zA-Z]+)\s+(.+)$/;
  const match = ingredientStr.match(regex);

  if (!match) return null;

  return {
    quantity: match[1].trim(),
    ingredient: match[2].trim(),
  };
};

router.post("/create-recipe", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealType } = req.body;

    // Fetch user data and preferences in parallel
    const [
      userQuery,
      recipesQuery,
      cantHavesQuery,
      mustHavesQuery,
      tastePreferencesQuery,
      dietaryGoalsQuery,
      cuisinePreferencesQuery,
    ] = await Promise.all([
      pool.query("SELECT id, name FROM users WHERE id = $1", [userId]),
      pool.query("SELECT title FROM recipes WHERE user_id = $1", [userId]),
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

    const user = userQuery.rows[0];
    const existingRecipes = recipesQuery.rows.map((recipe) => recipe.title);
    const cantHaves = cantHavesQuery.rows.map((row) => row.item);
    const mustHaves = mustHavesQuery.rows.map((row) => row.item);
    const tastePreferences = tastePreferencesQuery.rows.map((row) => row.item);
    const dietaryGoals = dietaryGoalsQuery.rows.map((row) => row.item);
    const cuisinePreferences = cuisinePreferencesQuery.rows.map(
      (row) => row.item
    );

    // Check for matching recipes in global_recipes
    const threeeDaysAgo = new Date();
    threeeDaysAgo.setDate(threeeDaysAgo.getDate() - 3);

    const matchingRecipesQuery = await pool.query(
      `SELECT * FROM global_recipes 
       WHERE meal_type = $1 
       AND last_queried_at < $2
       AND NOT ($3::text[] && cant_haves)  -- No overlap with cant_haves
       AND must_haves @> $4::text[]        -- Contains all must_haves
       AND taste_preferences && $5::text[]  -- Some overlap with taste preferences
       AND dietary_goals && $6::text[]      -- Some overlap with dietary goals
       AND cuisine_preferences && $7::text[] -- Some overlap with cuisine preferences
       AND title NOT IN (SELECT unnest($8::text[]))  -- Not in user's existing recipes`,
      [
        mealType || "meal",
        threeeDaysAgo.toISOString(),
        cantHaves,
        mustHaves,
        tastePreferences,
        dietaryGoals,
        cuisinePreferences,
        existingRecipes,
      ]
    );

    let recipe;

    if (matchingRecipesQuery.rows.length > 0) {
      // Randomly select one matching recipe
      const randomIndex = Math.floor(
        Math.random() * matchingRecipesQuery.rows.length
      );
      recipe = matchingRecipesQuery.rows[randomIndex];

      // Update last_queried_at for the selected recipe only
      await pool.query(
        "UPDATE global_recipes SET last_queried_at = NOW() WHERE id = $1",
        [recipe.id]
      );

      return res.json({ recipe });
    }

    // If no matching recipe found, generate new one using AI
    let prompt = `Generate a detailed recipe for ${
      user.name
    }. This should be a ${mealType || "meal"} recipe.`;

    // Add dietary restrictions
    if (cantHaves.length > 0) {
      prompt += `\nThe recipe MUST NOT include the following ingredients under any circumstances: ${cantHaves.join(
        ", "
      )}.`;
    }
    if (mustHaves.length > 0) {
      prompt += `\nThe recipe MUST include the following ingredients: ${mustHaves.join(
        ", "
      )}.`;
    }
    if (tastePreferences.length > 0) {
      prompt += `\nIt's preferable that the recipe follows these taste preferences: ${tastePreferences.join(
        ", "
      )}.`;
    }
    if (dietaryGoals.length > 0) {
      prompt += `\nIt's preferable that the recipe follows these dietary goals: ${dietaryGoals.join(
        ", "
      )}.`;
    }
    if (cuisinePreferences.length > 0) {
      prompt += `\nIt's preferable that the recipe follows these cuisine preferences: ${cuisinePreferences.join(
        ", "
      )}.`;
    }
    if (existingRecipes.length > 0) {
      prompt += `\nIMPORTANT: The recipe must be unique and MUST NOT be any of these existing recipes: ${existingRecipes.join(
        ", "
      )}.`;
    }

    // Add formatting instructions
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
[Nutritional details]`;

    // Generate recipe using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const recipeText = completion.choices[0].message.content;
    recipe = cleanAIResponse(recipeText);

    // Save to global_recipes table
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
        cantHaves,
        mustHaves,
        tastePreferences,
        dietaryGoals,
        cuisinePreferences,
        mealType || "meal",
      ]
    );

    res.json({ recipe });
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
        ingredients,
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
              ingredients,
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

    const analysisPrompt = `You are performing intelligent ingredient matching but MUST use exact database names in responses.

Database Items (THESE ARE THE ONLY VALID NAMES YOU CAN USE IN parsed.name):
${inventory
  .map(
    (item) => `"${item.item_name}" (id: ${item.id}, quantity: ${item.quantity})`
  )
  .join("\n")}.

IMPORTANT RULES:

1. Parsing Rules:
   - Handle mixed fractions (e.g., "1 1/2" becomes 1.5)
   - Handle simple fractions (e.g., "1/2" becomes 0.5)
   - Handle decimal numbers

Recipe Ingredients:
${recipe.ingredients.join("\n")}

Current Inventory:
${inventory.map((item) => `${item.quantity} of ${item.item_name}`).join("\n")}

Shopping List:
${shoppingList
  .map((item) => `${item.quantity} of ${item.item_name}`)
  .join("\n")}

ABSOLUTELY CRITICAL REQUIREMENT:
When you find a match, the "parsed.name" field MUST BE EXACTLY the database item_name. 
Do not use any other variation of the name - use the exact database name character-for-character.

Example of INCORRECT response:
Recipe: "1 large egg"
Database item: "Eggs"
WRONG response:
{
  "parsed": {
    "name": "egg"  <- WRONG! Must use "Eggs" exactly as it appears in database
  }
}

Example of CORRECT response:
Recipe: "1 large egg"
Database item: "Eggs"
CORRECT response:
{
  "parsed": {
    "name": "Eggs"  <- CORRECT! Uses exact database name
  }
}

More Examples:
1. If database has "Whole Milk" and recipe says "milk":
   - parsed.name MUST be "Whole Milk" (exact database name)
2. If database has "Extra Virgin Olive Oil" and recipe says "olive oil":
   - parsed.name MUST be "Extra Virgin Olive Oil" (exact database name)

Analyze each ingredient and return a JSON array where each object has this exact structure:
[
  {
    "original": "original ingredient text",
    "parsed": {
      "quantity": number,
      "name": "string"
    },
    "status": {
      "type": "in-inventory" | "in-shopping-list" | "missing" | "unparseable",
      "hasEnough": boolean,
      "available": {
        "quantity": number,
        "id": number
      } | null,
      "notes": "string explaining the match or mismatch"
    }
  }
]

Critical Requirements:
1. Consider ingredient matches carefully (e.g., "fresh lemon" ≠ "lemon juice")
2. Be conservative with matches - if unsure, mark as "missing

FINAL REMINDER: parsed.name must ALWAYS be copied exactly from the database item_name - never modified, never variations, exact character-for-character copy.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent ingredient matching system that MUST use exact database names in responses. Never modify database names.",
        },
        {
          role: "user",
          content: `${analysisPrompt}
          
          Return the response in this exact format:
          {
            "ingredients": [
              // array of ingredient analyses
            ]
          }`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const cleanGPTResponse = (response) => {
      try {
        // Parse the response if it's a string
        const parsed =
          typeof response === "string" ? JSON.parse(response) : response;

        // Extract the ingredients array from the response object
        const ingredientsArray = parsed.ingredients || [];

        if (!Array.isArray(ingredientsArray)) {
          throw new Error("Ingredients is not an array");
        }

        // Process each ingredient
        return ingredientsArray.map((ingredient) => {
          if (!ingredient.parsed) return ingredient;

          try {
            return {
              ...ingredient,
              parsed: {
                ...ingredient.parsed,
                quantity: ingredient.parsed.quantity,
              },
            };
          } catch (error) {
            console.error(`error for ${ingredient.original}:`, error);
            return {
              original: ingredient.original,
              status: {
                type: "unparseable",
                hasEnough: false,
                notes: "Failed to parse",
              },
            };
          }
        });
      } catch (e) {
        console.error("Error parsing response:", e);
        console.error("Raw response:", response);
        // Return a safe default for unparseable responses
        return recipe.ingredients.map((ing) => ({
          original: typeof ing === "string" ? ing : ing.original,
          status: {
            type: "unparseable",
            hasEnough: false,
            notes: "Failed to parse ingredient analysis",
          },
        }));
      }
    };

    let ingredients;
    try {
      const content = completion.choices[0].message.content;
      ingredients = cleanGPTResponse(content);

      if (!Array.isArray(ingredients)) {
        throw new Error("Failed to get valid ingredients array");
      }
    } catch (error) {
      console.error("Error processing GPT response:", error);
      // Log the raw response for debugging
      console.error("Raw GPT response:", completion.choices[0].message.content);
      // Provide a fallback response
      ingredients = recipe.ingredients.map((ing) => ({
        original: typeof ing === "string" ? ing : ing.original,
        status: {
          type: "unparseable",
          hasEnough: false,
          notes: "Analysis failed",
        },
      }));
    }

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

    const prompt = `Extract recipe information from this webpage content and format it as a JSON object. The webpage is from ${url}.

    Return a JSON object with exactly this structure:
    {
      "title": "Recipe title",
      "prepTime": "30 minutes",
      "cookTime": "45 minutes",
      "servings": "4",
      "ingredients": [
        "0.5 flour",
        "0.25 milk"
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

        Extract the information from this webpage content and return it as a valid JSON object:
    ${pageText.substring(0, 8000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a recipe extraction expert.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const recipe = JSON.parse(completion.choices[0].message.content);

    recipe.ingredients = recipe.ingredients.map((ingredient) => {
      try {
        const parsed = parseIngredientString(ingredient);
        if (!parsed) return ingredient;

        return `${parsed.quantity} ${parsed.ingredient}`;
      } catch (error) {
        console.error(`error for ${ingredient}:`, error);
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

    const prompt = `You are a recipe extraction expert. Carefully analyze this recipe image and extract all details. Look for recipe title, times, servings, ingredients list, step-by-step instructions, and any nutritional information.

    Important Guidelines:
    1. For ingredients:
       - Extract exact measurements and quantities
       - Keep original unit measurements
       - List each ingredient on its own line
       - Format quantities as decimals (1/2 → 0.5)
       - Include any preparation notes (e.g., "chopped", "diced")
    
    2. For instructions:
       - Preserve step numbers if present
       - Break complex steps into separate items
       - Include any temperature settings or timing notes
       - Keep cooking method details intact
    
    3. For times:
       - Extract specific prep and cook times if listed
       - Include any resting/cooling times
       - Format consistently as "X minutes" or "X hours Y minutes"
    
    4. For servings:
       - Look for yield information
       - Include portion size if specified
    
    5. For nutritional info:
       - Extract all available nutritional facts
       - Include serving size basis
       - Keep measurements in original units

    Return a complete, properly formatted JSON object with this exact structure:
    {
      "title": "Full recipe title",
      "prepTime": "Preparation time in minutes",
      "cookTime": "Cooking time in minutes",
      "servings": "Number of servings",
      "ingredients": [
        "0.5 cups flour",
        "0.25 cups milk"
      ],
      "instructions": [
        "Preheat oven to 350°F",
        "Mix dry ingredients",
        "Combine wet ingredients"
      ],
      "nutritionalInfo": [
        "Calories: 350 per serving",
        "Protein: 12g",
        "Fat: 14g"
      ]
    }

    If any field is not found in the image, use null or an empty array as appropriate. Ensure all ingredients include measurements where possible.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a recipe extraction expert trained to analyze recipe images and extract structured data. Be thorough and precise in your extraction.",
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
      max_tokens: 2000, // Increased token limit for more detailed response
      temperature: 0.1, // Reduced temperature for more consistent output
      response_format: { type: "json_object" },
    });

    const recipe = JSON.parse(completion.choices[0].message.content);

    // Double-check ingredient standardization
    recipe.ingredients = recipe.ingredients.map((ingredient) => {
      try {
        const parsed = parseIngredientString(ingredient);
        if (!parsed) return ingredient;
        return `${parsed.quantity} ${parsed.ingredient}`;
      } catch (error) {
        console.error(`error for ${ingredient}:`, error);
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
