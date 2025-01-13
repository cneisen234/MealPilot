const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");
const axios = require("axios");
const cheerio = require("cheerio");
const cleanAIResponse = require("../cleanAiResponse");
const vision = require("@google-cloud/vision");
const client = new vision.ImageAnnotatorClient();

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

    console.log(matchingRecipesQuery.rows);

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
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const recipeText = completion.choices[0].message.content;
    recipe = cleanAIResponse(recipeText);
    recipe.mealType = mealType;

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
      mealType,
    } = req.body;

    await pool.query("BEGIN");

    const recipeResult = await pool.query(
      `INSERT INTO recipes 
        (user_id, title, prep_time, cook_time, servings, ingredients, instructions, nutritional_info, meal_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        mealType,
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
              mealType,
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

    const analysisPrompt = `Analyze these recipe ingredients and match against inventory database items.
Your task is to parse quantities and match ingredients exactly.

INVENTORY DATABASE (ONLY USE THESE EXACT NAMES):
${inventory
  .map((item) => `"${item.item_name}" (id: ${item.id}, qty: ${item.quantity})`)
  .join("\n")}

RECIPE INGREDIENTS TO ANALYZE:
${recipe.ingredients.join("\n")}

CURRENT SHOPPING LIST:
${shoppingList
  .map((item) => `${item.item_name} (qty: ${item.quantity})`)
  .join("\n")}

CRITICAL RULES:
1. Analyze each ingredient for quantity and exact match
2. Convert all fractions to decimals (1/2 → 0.5, 1 1/2 → 1.5)
3. For matches, use EXACT inventory item names (e.g., "Fresh Eggs" not "eggs")
4. If unsure of match, mark as "missing"
5. Be conservative - "fresh lemon" ≠ "lemon juice"

FORMAT REQUIRED:
Return a JSON object with this structure:
{
  "ingredients": [
    {
      "original": "original ingredient text",
      "parsed": {
        "quantity": number,
        "name": "exact inventory item name"
      },
      "status": {
        "type": "in-inventory|in-shopping-list|missing|unparseable",
        "hasEnough": boolean,
        "available": {
          "quantity": number,
          "id": number
        }
      }
    }
  ]
}

EXAMPLE OUTPUT:
{
  "ingredients": [
    {
      "original": "2 cups milk",
      "parsed": {
        "quantity": 2,
        "name": "Whole Milk"
      },
      "status": {
        "type": "in-inventory",
        "hasEnough": true,
        "available": {
          "quantity": 4,
          "id": 123
        }
      }
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a precise ingredient matching system. Always maintain exact format and structure.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    let ingredients;
    try {
      const parsedResponse = JSON.parse(completion.choices[0].message.content);

      if (
        !parsedResponse.ingredients ||
        !Array.isArray(parsedResponse.ingredients)
      ) {
        throw new Error("Invalid response structure");
      }

      ingredients = parsedResponse.ingredients.map((ingredient) => {
        // Validate and ensure correct structure
        if (!ingredient.original || !ingredient.parsed || !ingredient.status) {
          return {
            original: ingredient.original || "Unknown ingredient",
            status: {
              type: "unparseable",
              hasEnough: false,
              notes: "Invalid ingredient format",
            },
          };
        }

        return {
          original: ingredient.original,
          parsed: {
            quantity: Number(ingredient.parsed.quantity) || 0,
            name: ingredient.parsed.name,
          },
          status: {
            type: ingredient.status.type,
            hasEnough: ingredient.status.hasEnough || false,
            available: ingredient.status.available || null,
            notes: ingredient.status.notes,
          },
        };
      });
    } catch (error) {
      console.error("Error processing GPT response:", error);
      console.error("Raw response:", completion.choices[0].message.content);

      ingredients = recipe.ingredients.map((ing) => ({
        original: typeof ing === "string" ? ing : ing.original,
        status: {
          type: "unparseable",
          hasEnough: false,
          notes: "Failed to analyze ingredient",
        },
      }));
    }

    res.json({
      ...recipe,
      ingredients,
    });
  } catch (error) {
    console.error("Recipe analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze recipe",
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
      mealType,
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
              mealType,
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
           mealType = $8
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        title,
        prepTime,
        cookTime,
        servings,
        ingredients,
        instructions,
        nutritionalInfo,
        mealType,
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
      ],
      "mealType": "dinner"
    }

        Extract the information from this webpage content and return it as a valid JSON object:
    ${pageText.substring(0, 8000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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

    // Input validation
    if (!imageData) {
      return res.status(400).json({ message: "Image data is required" });
    }

    // Validate base64 image format
    if (!/^data:image\/[a-z]+;base64,/.test(imageData)) {
      return res.status(400).json({ message: "Invalid image data format" });
    }

    // Clean up base64 image data
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    // 1. Use Google Vision API for text detection and label detection in parallel
    const [textResult, labelResult] = await Promise.all([
      client.documentTextDetection({
        image: { content: Buffer.from(base64Image, "base64") },
      }),
      client.labelDetection({
        image: { content: Buffer.from(base64Image, "base64") },
      }),
    ]);

    const fullText = textResult[0].fullTextAnnotation;
    if (!fullText) {
      return res.status(400).json({ message: "No text detected in image" });
    }

    // Extract food labels with high confidence
    const foodLabels = labelResult[0].labelAnnotations
      .filter((label) => label.score > 0.7)
      .map((label) => label.description);

    // 2. Process the OCR text into logical sections
    const lines = fullText.text.split("\n");

    // Common section identifiers
    const sectionPatterns = {
      ingredients: /^ingredients:?|what you(')?ll need:?/i,
      instructions: /^(instructions|directions|method|steps):?/i,
      nutrition: /^nutrition(al)?( facts| information)?:?/i,
      servings: /^(serves|servings|yield):?\s*(\d+)/i,
      prepTime: /(prep(aration)? time):?\s*(\d+)/i,
      cookTime: /(cook(ing)? time):?\s*(\d+)/i,
    };

    // Initialize sections
    const sections = {
      title: [],
      ingredients: [],
      instructions: [],
      nutrition: [],
      meta: [],
    };

    // Track current section
    let currentSection = "title";

    // Process lines into sections
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Check for section headers
      if (sectionPatterns.ingredients.test(trimmedLine)) {
        currentSection = "ingredients";
        return;
      } else if (sectionPatterns.instructions.test(trimmedLine)) {
        currentSection = "instructions";
        return;
      } else if (sectionPatterns.nutrition.test(trimmedLine)) {
        currentSection = "nutrition";
        return;
      }

      // Check for meta information
      const servingsMatch = trimmedLine.match(sectionPatterns.servings);
      const prepTimeMatch = trimmedLine.match(sectionPatterns.prepTime);
      const cookTimeMatch = trimmedLine.match(sectionPatterns.cookTime);

      if (servingsMatch || prepTimeMatch || cookTimeMatch) {
        sections.meta.push(trimmedLine);
        return;
      }

      // Add line to current section
      sections[currentSection].push(trimmedLine);
    });

    // 3. Use GPT to interpret and structure the extracted text
    const gptPrompt = `Based on this extracted recipe text and detected food items:

Food items detected: ${foodLabels.join(", ")}

Title candidates:
${sections.title.join("\n")}

Meta information:
${sections.meta.join("\n")}

Ingredients section:
${sections.ingredients.join("\n")}

Instructions section:
${sections.instructions.join("\n")}

Nutrition section:
${sections.nutrition.join("\n")}

Convert this into a structured recipe. Guidelines:
1. Choose the most appropriate title based on the content
2. Standardize all measurements (convert fractions to decimals)
3. Format instructions into clear, numbered steps
4. Identify the meal type based on ingredients and context
5. Extract exact prep/cook times and servings from meta information
6. Organize nutritional info into clear bullet points

Return a JSON object with this exact structure:
{
  "title": "string",
  "prepTime": "string (in minutes)",
  "cookTime": "string (in minutes)",
  "servings": "string",
  "ingredients": ["array of strings"],
  "instructions": ["array of strings"],
  "nutritionalInfo": ["array of strings"],
  "mealType": "string (breakfast/lunch/dinner/dessert/etc)"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional recipe formatter specializing in converting OCR text into structured recipes.",
        },
        {
          role: "user",
          content: gptPrompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const recipe = JSON.parse(completion.choices[0].message.content);

    // 4. Post-process and validate the recipe
    recipe.ingredients = recipe.ingredients.map((ingredient) => {
      try {
        const standardized = standardizeIngredient(ingredient);
        return standardized || ingredient;
      } catch (error) {
        console.error(`Error standardizing ingredient: ${ingredient}`, error);
        return ingredient;
      }
    });

    // Validate all required fields
    const validatedRecipe = {
      title: recipe.title || "Untitled Recipe",
      prepTime: recipe.prepTime || "N/A",
      cookTime: recipe.cookTime || "N/A",
      servings: recipe.servings || "N/A",
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      nutritionalInfo: recipe.nutritionalInfo || [],
      mealType: recipe.mealType || "main course",
    };

    res.json({ recipe: validatedRecipe });
  } catch (error) {
    console.error("Error processing recipe image:", error);
    if (error.response) {
      return res.status(error.response.status).json({
        message: "Error processing recipe",
        details: error.response.data.message,
      });
    }
    return res.status(500).json({
      message: "Error extracting recipe from image",
      error: error.message,
    });
  }
});

// Helper function to standardize ingredient measurements
function standardizeIngredient(ingredient) {
  // Common fraction patterns
  const fractionPattern = /(\d+\/\d+|\d+\s+\d+\/\d+)/g;

  // Replace fractions with decimal equivalents
  return ingredient.replace(fractionPattern, (match) => {
    if (match.includes(" ")) {
      // Mixed number (e.g., "1 1/2")
      const [whole, fraction] = match.split(" ");
      const [num, denom] = fraction.split("/");
      return (parseInt(whole) + parseInt(num) / parseInt(denom)).toString();
    } else {
      // Simple fraction (e.g., "1/2")
      const [num, denom] = match.split("/");
      return (parseInt(num) / parseInt(denom)).toString();
    }
  });
}

module.exports = router;
