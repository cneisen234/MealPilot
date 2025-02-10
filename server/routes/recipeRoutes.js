const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const checkAiActions = require("../middleware/aiActions");
const checkPaywall = require("../middleware/checkPaywall");
const pool = require("../db");
const openai = require("../openai");
const deepseek = require("../deepseek");
const axios = require("axios");
const cheerio = require("cheerio");
const cleanAIResponse = require("../cleanAiResponse");
const vision = require("@google-cloud/vision");
const client = new vision.ImageAnnotatorClient({
  credentials: {
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  },
});

router.post(
  "/generate-random",
  [authMiddleware, checkAiActions, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const [recipesQuery, cantHavesQuery] = await Promise.all([
        pool.query("SELECT title FROM recipes WHERE user_id = $1", [userId]),
        pool.query("SELECT item FROM cant_haves WHERE user_id = $1", [userId]),
      ]);

      const cantHaves = cantHavesQuery.rows.map((row) => row.item);
      const todayGlobalRecipesQuery = await pool.query(
        `SELECT title
        FROM global_recipes 
        WHERE DATE(last_queried_at) = CURRENT_DATE
        AND ($1::text[] = '{}' OR (cant_haves @> $1::text[] AND array_length($1::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($1::text[])
          INTERSECT
          SELECT DISTINCT unnest(cant_haves)
        ), 1)))`,
        [cantHaves]
      );

      const existingRecipes = [
        ...recipesQuery.rows.map((recipe) => recipe.title),
        ...todayGlobalRecipesQuery.rows.map((recipe) => recipe.title),
      ];
      // Generate base prompt without any preferences
      let prompt = `Generate a detailed recipe.`;

      // Add dietary restrictions
      if (cantHaves.length > 0) {
        prompt += `\nThe recipe MUST NOT include the following ingredients under any circumstances: ${cantHaves.join(
          ", "
        )}.`;
      }
      if (existingRecipes.length > 0) {
        prompt += `\nIMPORTANT: The recipe must be unique and MUST NOT be any of these existing recipes: ${existingRecipes.join(
          ", "
        )}.`;
      }

      // Add formatting instructions
      prompt += `\nPlease format the recipe exactly as follows and include ALL fields:

Name: [Recipe Name]
Prep Time: [Exact time, e.g. "20 minutes" OR "1 hour"]
Cook Time: [Exact time, e.g. "30 minutes" OR "1 hour"]
Servings: ["4"]

Ingredients:
[List each ingredient on a new line with precise measurements]

Instructions:
**[Main Step Title]:**
[Sub-steps with details]
[Additional sub-steps if needed]
**[Next Main Step Title]:**
[Sub-steps with details]
[Continue pattern for all steps]

Nutritional Information:
- Calories: [number] kcal
- Protein: [number]g
- Carbohydrates: [number]g
- Fat: [number]g

IMPORTANT: All fields must be included and properly formatted as shown above, especially the prep time, cook time, and complete nutritional information.`;

      let completion;
      const timeout = 20000;
      let timeoutId;

      const timeoutPromise = new Promise(
        (_, reject) =>
          (timeoutId = setTimeout(() => {
            console.log("DeepSeek was too slow, forcing fallback to GPT");
            reject(new Error("DeepSeek took too long"));
          }, timeout))
      );

      const deepseekPromise = deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 1.0,
      });

      try {
        completion = await Promise.race([deepseekPromise, timeoutPromise]);
        console.log("Using DeepSeek model");
        clearTimeout(timeoutId);
      } catch (aiError) {
        if (aiError.message === "DeepSeek took too long") {
          console.log("Fallback to GPT due to timeout");
        } else {
          console.log("Fallback to GPT due to error:", aiError.message);
        }

        completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 1.0,
        });
        console.log("Using GPT-3.5 model");
      }

      const recipeText = completion.choices[0].message.content;
      const recipe = cleanAIResponse(recipeText);

      // Save to global_recipes table with minimal metadata
      await pool.query(
        `INSERT INTO global_recipes (
          title, prep_time, cook_time, servings, 
          ingredients, instructions, nutritional_info,
          meal_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          recipe.title,
          recipe.prepTime,
          recipe.cookTime,
          recipe.servings,
          recipe.ingredients,
          recipe.instructions,
          recipe.nutritionalInfo,
          "meal", // Default meal type
        ]
      );

      res.json({ recipe });
    } catch (error) {
      console.error("Error generating random recipe:", error);
      res.status(500).json({
        error: "An error occurred while generating the recipe",
      });
    }
  }
);

router.post(
  "/create-recipe",
  [authMiddleware, checkAiActions, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Fetch user data and preferences in parallel
      const [
        recipesQuery,
        cantHavesQuery,
        mustHavesQuery,
        tastePreferencesQuery,
        dietaryGoalsQuery,
        cuisinePreferencesQuery,
        selectedMealTypeResult,
        selectedServingsResult,
      ] = await Promise.all([
        pool.query("SELECT title FROM recipes WHERE user_id = $1", [userId]),
        pool.query("SELECT item FROM cant_haves WHERE user_id = $1", [userId]),
        pool.query("SELECT item FROM must_haves WHERE user_id = $1", [userId]),
        pool.query("SELECT item FROM taste_preferences WHERE user_id = $1", [
          userId,
        ]),
        pool.query("SELECT item FROM dietary_goals WHERE user_id = $1", [
          userId,
        ]),
        pool.query("SELECT item FROM cuisine_preferences WHERE user_id = $1", [
          userId,
        ]),
        pool.query("SELECT item FROM meal_types WHERE user_id = $1", [userId]),
        pool.query("SELECT item FROM selected_servings WHERE user_id = $1", [
          userId,
        ]),
      ]);

      const cantHaves = cantHavesQuery.rows.map((row) => row.item);
      const mustHaves = mustHavesQuery.rows.map((row) => row.item);
      const tastePreferences = tastePreferencesQuery.rows.map(
        (row) => row.item
      );
      const dietaryGoals = dietaryGoalsQuery.rows.map((row) => row.item);
      const cuisinePreferences = cuisinePreferencesQuery.rows.map(
        (row) => row.item
      );
      const mealType =
        selectedMealTypeResult.rows.length > 0
          ? selectedMealTypeResult.rows[0].item
          : "main course";

      const servings =
        selectedServingsResult.rows.length > 0
          ? selectedServingsResult.rows[0].item
          : "4";

      const todayGlobalRecipesQuery = await pool.query(
        `SELECT title
        FROM global_recipes 
        WHERE meal_type = $1
        AND DATE(last_queried_at) = CURRENT_DATE
        AND ($2::text[] = '{}' OR (cant_haves @> $2::text[] AND array_length($2::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($2::text[])
          INTERSECT
          SELECT DISTINCT unnest(cant_haves)
        ), 1)))
        AND ($3::text[] = '{}' OR (must_haves @> $3::text[] AND array_length($3::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($3::text[])
          INTERSECT
          SELECT DISTINCT unnest(must_haves)
        ), 1)))
        AND ($4::text[] = '{}' OR (taste_preferences @> $4::text[] AND array_length($4::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($4::text[])
          INTERSECT
          SELECT DISTINCT unnest(taste_preferences)
        ), 1)))
        AND ($5::text[] = '{}' OR (dietary_goals @> $5::text[] AND array_length($5::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($5::text[])
          INTERSECT
          SELECT DISTINCT unnest(dietary_goals)
        ), 1)))
        AND ($6::text[] = '{}' OR (cuisine_preferences @> $6::text[] AND array_length($6::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($6::text[])
          INTERSECT
          SELECT DISTINCT unnest(cuisine_preferences)
        ), 1)))`,
        [
          mealType || "meal",
          cantHaves,
          mustHaves,
          tastePreferences,
          dietaryGoals,
          cuisinePreferences,
        ]
      );

      const existingRecipes = [
        ...recipesQuery.rows.map((recipe) => recipe.title),
        ...todayGlobalRecipesQuery.rows.map((recipe) => recipe.title),
      ];

      // Check for matching recipes in global_recipes
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const matchingRecipesQuery = await pool.query(
        `SELECT *
        FROM global_recipes 
        WHERE meal_type = $1
        AND last_queried_at < $2
        AND ($3::text[] = '{}' OR (cant_haves @> $3::text[] AND array_length($3::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($3::text[])
          INTERSECT
          SELECT DISTINCT unnest(cant_haves)
        ), 1)))
        AND ($4::text[] = '{}' OR (must_haves @> $4::text[] AND array_length($4::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($4::text[])
          INTERSECT
          SELECT DISTINCT unnest(must_haves)
        ), 1)))
        AND ($5::text[] = '{}' OR (taste_preferences @> $5::text[] AND array_length($5::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($5::text[])
          INTERSECT
          SELECT DISTINCT unnest(taste_preferences)
        ), 1)))
        AND ($6::text[] = '{}' OR (dietary_goals @> $6::text[] AND array_length($6::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($6::text[])
          INTERSECT
          SELECT DISTINCT unnest(dietary_goals)
        ), 1)))
        AND ($7::text[] = '{}' OR (cuisine_preferences @> $7::text[] AND array_length($7::text[], 1) = array_length(ARRAY(
          SELECT DISTINCT unnest($7::text[])
          INTERSECT
          SELECT DISTINCT unnest(cuisine_preferences)
        ), 1)));`,
        [
          mealType || "meal",
          threeDaysAgo.toISOString(),
          cantHaves,
          mustHaves,
          tastePreferences,
          dietaryGoals,
          cuisinePreferences,
        ]
      );

      let recipe;

      if (matchingRecipesQuery.rows.length > 0) {
        // Randomly select one matching recipe
        const randomIndex = Math.floor(
          Math.random() * matchingRecipesQuery.rows.length
        );
        recipe = matchingRecipesQuery.rows[randomIndex];

        // If servings is different, adjust ingredients proportionally
        if (servings && recipe.servings !== servings) {
          const ratio = parseInt(servings) / parseInt(recipe.servings);
          // Adjust ingredients
          recipe.ingredients = recipe.ingredients.map((ingredient) => {
            const match = ingredient.match(/^([\d.]+)\s+(.+)$/);
            if (match) {
              const amount = parseFloat(match[1]);
              const rest = match[2];
              return `${(amount * ratio).toFixed(2)} ${rest}`;
            }
            return ingredient;
          });

          console.log(recipe);

          // Adjust nutritional info proportionally
          recipe.nutritionalInfo = recipe.nutritional_info.map((info) => {
            const match = info.match(/^(.*?):\s*([\d.]+)\s*([a-zA-Z]+)$/);
            if (match) {
              const [_, label, amount, unit] = match;
              const newAmount = (parseFloat(amount) * ratio).toFixed(2);
              return `${label}: ${newAmount} ${unit}`;
            }
            return info;
          });

          // Update servings
          recipe.servings = servings;

          // Keep the time fields (they don't need to change with servings)
          recipe.prepTime = recipe.prepTime || "0 minutes";
          recipe.cookTime = recipe.cookTime || "0 minutes";
        }

        // Update last_queried_at for the selected recipe only
        await pool.query(
          "UPDATE global_recipes SET last_queried_at = NOW() WHERE id = $1",
          [recipe.id]
        );

        return res.json({ recipe });
      }

      // If no matching recipe found, generate new one using AI
      let prompt = `Generate a detailed recipe. This should be a ${
        mealType || "meal"
      } recipe for ${servings || "4"} servings.`;

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
      prompt += `\nPlease format the recipe exactly as follows and include ALL fields:

Name: [Recipe Name]
Prep Time: [Exact time, e.g. "20 minutes" OR "1 hour"]
Cook Time: [Exact time, e.g. "30 minutes" OR "1 hour"]
Servings: ${servings || "4"}

Ingredients:
[List each ingredient on a new line with precise measurements]

Instructions:
**[Main Step Title]:**
[Sub-steps with details]
[Additional sub-steps if needed]
**[Next Main Step Title]:**
[Sub-steps with details]
[Continue pattern for all steps]

Nutritional Information:
- Calories: [number] kcal
- Protein: [number]g
- Carbohydrates: [number]g
- Fat: [number]g

IMPORTANT: All fields must be included and properly formatted as shown above, especially the prep time, cook time, and complete nutritional information.`;

      let completion;
      const timeout = 20000; // Timeout in milliseconds
      let timeoutId;

      const timeoutPromise = new Promise(
        (_, reject) =>
          (timeoutId = setTimeout(() => {
            console.log("DeepSeek was too slow, forcing fallback to GPT");
            reject(new Error("DeepSeek took too long"));
          }, timeout))
      );

      const deepseekPromise = deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 1.0,
      });

      try {
        // Use Promise.race to execute both the DeepSeek and timeout promises
        completion = await Promise.race([deepseekPromise, timeoutPromise]);
        console.log("Using DeepSeek model");
        clearTimeout(timeoutId);
      } catch (aiError) {
        // Fallback to GPT if DeepSeek fails or times out
        if (aiError.message === "DeepSeek took too long") {
          console.log("Fallback to GPT due to timeout");
        } else {
          console.log("Fallback to GPT due to error:", aiError.message);
        }

        // Generate recipe using GPT
        completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 1.0,
        });
        console.log("Using GPT-3.5 model");
      }
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
  }
);

router.post(
  "/save-recipe",
  [authMiddleware, checkPaywall],
  async (req, res) => {
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

      const recipeCount = await pool.query(
        "SELECT COUNT(*) FROM recipes WHERE user_id = $1",
        [userId]
      );

      if (recipeCount.rows[0].count >= 100) {
        return res.status(400).json({
          message:
            "Recipe limit reached. Maximum 100 recipes allowed per account.",
        });
      }

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
  }
);

router.get("/myrecipes", [authMiddleware, checkPaywall], async (req, res) => {
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

router.get(
  "/myrecipes/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
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
  }
);

router.get(
  "/myrecipesinventory/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const recipeId = req.params.id;

      // Words that are too generic to match on alone unless they're the only word
      const genericIngredientWords = new Set([
        "syrup",
        "sauce",
        "oil",
        "vinegar",
        "cream",
        "milk",
        "cheese",
        "flour",
        "sugar",
        "salt",
        "pepper",
        "spice",
        "seasoning",
        "broth",
        "stock",
        "juice",
        "extract",
        "powder",
        "paste",
        "butter",
        "water",
        "wine",
        "bread",
        "rice",
        "pasta",
        "noodles",
        "red",
        "green",
        "blue",
        "yellow",
        "white",
        "black",
        "brown",
        "orange",
        "purple",
        "pink",
        "golden",
        "dark",
        "light",
        "sliced",
        "diced",
        "chopped",
        "minced",
        "grated",
        "shredded",
        "crushed",
        "ground",
        "mashed",
        "pureed",
        "whipped",
        "beaten",
        "mixed",
        "blended",
        "stirred",
        "folded",
        "kneaded",
        "rolled",
        "stuffed",
        "wrapped",
        "peeled",
        "cored",
        "seeded",
        "pitted",
        "trimmed",
        "cleaned",
        "washed",
        "rinsed",
        "raw",
        "cooked",
        "prepared",
        "processed",
        "canned",
        "frozen",
        "fresh",
        "dried",
        "dehydrated",
        "roasted",
        "toasted",
        "grilled",
        "baked",
        "fried",
        "steamed",
        "boiled",
        "sauteed",
        "braised",
        "broiled",
        "smoked",
        "cured",
        "pickled",
        "fermented",
        "hot",
        "cold",
        "warm",
        "chilled",
        "room temperature",
        "lukewarm",
        "smooth",
        "chunky",
        "creamy",
        "crunchy",
        "crispy",
        "tender",
        "firm",
        "soft",
        "hard",
        "thick",
        "thin",
        "organic",
        "natural",
        "artificial",
        "sweetened",
        "unsweetened",
        "salted",
        "unsalted",
        "seasoned",
        "plain",
        "pure",
        "refined",
        "unrefined",
        "premium",
        "regular",
        "extra",
        "fine",
        "coarse",
        "small",
        "medium",
        "large",
        "mini",
        "bite-sized",
        "whole",
        "half",
        "quarter",
        "prepared",
        "divided",
        "separated",
        "reserved",
        "packed",
        "heaping",
        "level",
        "rounded",
        "sifted",
        "melted",
        "softened",
        "room temperature",
        "overnight",
        "aged",
        "day-old",
        "fresh",
      ]);

      const [recipeResult, inventoryResult] = await Promise.all([
        pool.query("SELECT * FROM recipes WHERE id = $1 AND user_id = $2", [
          recipeId,
          userId,
        ]),
        pool.query("SELECT * FROM inventory WHERE user_id = $1", [userId]),
      ]);

      if (recipeResult.rows.length === 0) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      const recipe = recipeResult.rows[0];
      const inventory = inventoryResult.rows;

      const extractItemName = (original) => {
        let processed = original.toLowerCase();
        processed = processed.replace(/\d+(\.\d+)?(\s*\/\s*\d+)?/g, "");

        const measurements = [
          "cup",
          "cups",
          "tablespoon",
          "tablespoons",
          "tbsp",
          "teaspoon",
          "teaspoons",
          "tsp",
          "pound",
          "pounds",
          "lb",
          "lbs",
          "ounce",
          "ounces",
          "oz",
          "gram",
          "grams",
          "g",
          "ml",
          "milliliter",
          "milliliters",
          "pinch",
          "pinches",
          "dash",
          "dashes",
          "handful",
          "handfuls",
          "piece",
          "pieces",
          "slice",
          "slices",
          "can",
          "cans",
          "package",
          "packages",
          "bottle",
          "bottles",
        ];

        measurements.forEach((measure) => {
          const measureRegex = new RegExp(`\\b${measure}s?\\b`, "g");
          processed = processed.replace(measureRegex, "");
        });

        const connectors = [
          "of",
          "the",
          "a",
          "an",
          "fresh",
          "chopped",
          "diced",
          "sliced",
          "minced",
          "ground",
          "frozen",
          "canned",
          "dried",
          "raw",
          "cooked",
        ];

        connectors.forEach((connector) => {
          const connectorRegex = new RegExp(`\\b${connector}\\b`, "g");
          processed = processed.replace(connectorRegex, "");
        });

        return processed.replace(/[.,]|(\s+)/g, " ").trim();
      };

      const doIngredientsMatch = (cleanedItem, cleanedInventoryItem) => {
        const itemWords = cleanedItem.split(" ");
        const inventoryWords = cleanedInventoryItem.split(" ");

        // Handle compound ingredients (like "cream cheese")
        // If both items are compound and contain generic words, they must match exactly
        const isItemCompound =
          itemWords.length > 1 &&
          itemWords.some((word) => genericIngredientWords.has(word));
        const isInventoryCompound =
          inventoryWords.length > 1 &&
          inventoryWords.some((word) => genericIngredientWords.has(word));

        if (isItemCompound && isInventoryCompound) {
          // For compound ingredients, require exact match
          return cleanedItem === cleanedInventoryItem;
        }

        // Case 1: If either is a single generic word (e.g., just "milk"),
        // only match if the other item is exactly the same
        if (
          itemWords.length === 1 &&
          genericIngredientWords.has(itemWords[0])
        ) {
          return cleanedItem === cleanedInventoryItem;
        }
        if (
          inventoryWords.length === 1 &&
          genericIngredientWords.has(inventoryWords[0])
        ) {
          return cleanedItem === cleanedInventoryItem;
        }

        // Case 2: For multi-word items where only one has generic words,
        // match on non-generic words only
        const itemNonGenericWords = itemWords.filter(
          (word) => !genericIngredientWords.has(word)
        );
        const inventoryNonGenericWords = inventoryWords.filter(
          (word) => !genericIngredientWords.has(word)
        );

        // If we have non-generic words in both, match on those
        if (
          itemNonGenericWords.length > 0 &&
          inventoryNonGenericWords.length > 0
        ) {
          const itemSet = new Set(itemNonGenericWords);
          const inventorySet = new Set(inventoryNonGenericWords);

          // Require all non-generic words to match
          if (itemNonGenericWords.length < inventoryNonGenericWords.length) {
            return itemNonGenericWords.every((word) => inventorySet.has(word));
          } else {
            return inventoryNonGenericWords.every((word) => itemSet.has(word));
          }
        }

        // If we get here, one of the items has only generic words
        // In this case, require exact match to prevent false positives
        return cleanedItem === cleanedInventoryItem;
      };

      const extractQuantity = (original) => {
        const match = original.match(/\d+(\.\d+)?(\s*\/\s*\d+)?/);
        if (!match) return 1;

        const numStr = match[0];
        if (numStr.includes("/")) {
          const [num, denom] = numStr
            .split("/")
            .map((n) => parseFloat(n.trim()));
          return num / denom;
        }
        return parseFloat(numStr);
      };

      const ingredients = recipe.ingredients.map((ingredient) => {
        const parsedName = extractItemName(ingredient);
        const parsedQuantity = extractQuantity(ingredient);

        // Look for match in inventory using our improved matching logic
        const inventoryMatch = inventory.find((item) => {
          const inventoryName = extractItemName(item.item_name);
          return doIngredientsMatch(parsedName, inventoryName);
        });

        if (inventoryMatch) {
          return {
            original: ingredient,
            parsed: {
              quantity: parsedQuantity,
              name: inventoryMatch.item_name,
            },
            status: {
              type: "in-inventory",
              hasEnough: inventoryMatch.quantity >= parsedQuantity,
              available: {
                quantity: inventoryMatch.quantity,
                id: inventoryMatch.id,
              },
            },
          };
        }

        return {
          original: ingredient,
          parsed: {
            quantity: parsedQuantity,
            name: parsedName,
          },
          status: {
            type: "missing",
            hasEnough: false,
          },
        };
      });

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
  }
);

router.put(
  "/myrecipes/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
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
        await pool.query(
          "UPDATE meal_plans SET meals = $1 WHERE user_id = $2",
          [meals, userId]
        );
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
       nutritional_info = $7,
       meal_type = $8 WHERE id = $9 AND user_id = $10
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
  }
);

// recipeRoutes.js
router.delete(
  "/myrecipes/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
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
              meals[date][mealTime] = {
                title: meals[date][mealTime].title,
                prepTime: meals[date][mealTime].prepTime,
                cookTime: meals[date][mealTime].cookTime,
                servings: meals[date][mealTime].servings,
                ingredients: meals[date][mealTime].ingredients,
                instructions: meals[date][mealTime].instructions,
                nutritionalInfo: meals[date][mealTime].nutritionalInfo,
                mealType: meals[date][mealTime].mealType,
                recipeId: null,
                isNew: true,
              };
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
  }
);

router.post(
  "/scrape-recipe",
  [authMiddleware, checkAiActions, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Check recipe count
      const recipeCount = await pool.query(
        "SELECT COUNT(*) FROM recipes WHERE user_id = $1",
        [userId]
      );

      if (recipeCount.rows[0].count >= 100) {
        return res.status(400).json({
          message:
            "Recipe limit reached. Maximum 100 recipes allowed per account.",
        });
      }

      const { url } = req.body;

      // Fetch the webpage content
      const response = await axios.get(url);
      const html = response.data;

      // Load the HTML into cheerio for basic data extraction
      const $ = cheerio.load(html);
      const pageText = $("body").text().replace(/\s+/g, " ").trim();

      // Track parenthetical measurements to preserve them
      const measurementMatches = [...pageText.matchAll(/\(([^)]+)\)/g)];
      const preservedMeasurements = measurementMatches.map((match) => match[1]);

      const gptPrompt = `
      You are an AI recipe expert specialized in EXACT transcription. Your primary rule is to maintain EXACT measurements and packaging information. Based on the extracted webpage content, please:
      
      CRITICAL RULES:
      1. NEVER convert measurements between units (e.g., never convert oz to cups)
      2. ALWAYS preserve parenthetical measurements exactly as written - e.g., "(8 oz.)" must stay exactly as "(8 oz.)"
      3. ALWAYS preserve brand names and package descriptions exactly
      4. NEVER add interpretive text like "for serving" or "for dusting" unless it appears in the original
      5. NEVER assume or infer measurements - use exactly what's in the text
      6. Correct any misspelled or non-sensical words (e.g., "jor" to "jar")
      7. Identify the recipe title and make it clear and concise
      8. Break the ingredients and instructions into logical sections and structure them properly
      9. Remove any unnecessary or promotional text (e.g., disclaimers, irrelevant details)
      10. Ensure the formatting follows a typical recipe structure

      Return the recipe in this JSON format:
      {
        "title": "Recipe title",
        "prepTime": "30 minutes",
        "cookTime": "45 minutes",
        "servings": "4",
        "ingredients": ["ingredient 1", "ingredient 2", ...],
        "instructions": ["step 1", "step 2", ...],
        "nutritionalInfo": ["calories: 200", "protein: 5g", ...],
        "mealType": "main course"
      }

      Here is the extracted webpage content:
      ${pageText.substring(0, 8000)}
      
      Source URL: ${url}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a recipe expert who excels at maintaining exact measurements and formatting recipes clearly. Your primary focus is on preserving precise ingredient quantities and packaging information.",
          },
          {
            role: "user",
            content: gptPrompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      const recipe = JSON.parse(completion.choices[0].message.content);

      // Post-process ingredients to verify exact measurements are preserved
      const processedRecipe = {
        ...recipe,
        ingredients:
          recipe.ingredients?.map((ingredient) => {
            // Verify each preserved measurement appears in the ingredient text
            preservedMeasurements.forEach((measurement) => {
              if (!ingredient.includes(`(${measurement})`)) {
                // If a parenthetical measurement is missing, reinsert it
                const measurementMatch = measurement.match(
                  /(\d+)\s*(oz\.|ounces?|lbs?\.?|pounds?|pkg\.?|packages?)/i
                );
                if (measurementMatch) {
                  const [_, num, unit] = measurementMatch;
                  const searchNum = new RegExp(`\\b${num}\\b`);
                  if (searchNum.test(ingredient)) {
                    ingredient = ingredient.replace(
                      searchNum,
                      `(${measurement})`
                    );
                  }
                }
              }
            });
            return ingredient.trim();
          }) || [],
      };

      // Validate and format the final recipe object
      const validatedRecipe = {
        title: processedRecipe.title || "Untitled Recipe",
        prepTime: processedRecipe.prepTime || "N/A",
        cookTime: processedRecipe.cookTime || "N/A",
        servings: processedRecipe.servings || "4",
        ingredients: processedRecipe.ingredients,
        instructions: processedRecipe.instructions || [],
        nutritionalInfo: processedRecipe.nutritionalInfo || [],
        mealType: processedRecipe.mealType || "main course",
      };

      res.json({ recipe: validatedRecipe });
    } catch (error) {
      console.error("Error scraping recipe:", error);
      res.status(500).json({
        message: "Error extracting recipe information",
        error: error.message,
      });
    }
  }
);

router.post(
  "/ocr-recipe",
  [authMiddleware, checkAiActions, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Check recipe count
      const recipeCount = await pool.query(
        "SELECT COUNT(*) FROM recipes WHERE user_id = $1",
        [userId]
      );

      if (recipeCount.rows[0].count >= 100) {
        return res.status(400).json({
          message:
            "Recipe limit reached. Maximum 100 recipes allowed per account.",
        });
      }

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

      // 2. Process the OCR text - preserve ALL original formatting and measurements
      const rawText = fullText.text;

      // Track parenthetical measurements separately to ensure they're preserved
      const measurementMatches = [...fullText.text.matchAll(/\(([^)]+)\)/g)];
      const preservedMeasurements = measurementMatches.map((match) => match[1]);

      // 3. Construct a prompt for GPT to structure the recipe
      const gptPrompt = `
      You are an AI recipe expert specialized in EXACT transcription. Your primary rule is to maintain EXACT measurements and packaging information. Based on the extracted recipe text, please:
      
      CRITICAL RULES:
      1. NEVER convert measurements between units (e.g., never convert oz to cups)
      2. ALWAYS preserve parenthetical measurements exactly as written - e.g., "(8 oz.)" must stay exactly as "(8 oz.)"
      3. ALWAYS preserve brand names and package descriptions exactly
      4. NEVER add interpretive text like "for serving" or "for dusting" unless it appears in the original
      5. NEVER assume or infer measurements - use exactly what's in the text

      6. Correct any misspelled or non-sensical words (e.g., "jor" to "jar").
      7. Identify the recipe title and make it clear and concise.
      8. Break the ingredients and instructions into logical sections and structure them properly.
      9. Remove any unnecessary or promotional text (e.g., disclaimers, irrelevant details).
      10. Ensure the formatting follows a typical recipe structure (title, ingredients, instructions, prep/cook time, servings, etc.).
      11. Output the final recipe in this JSON format:

      {
        "title": "Recipe title",
        "prepTime": "30 minutes",
        "cookTime": "45 minutes",
        "servings": "4",
        "ingredients": ["ingredient 1", "ingredient 2", ...],
        "instructions": ["step 1", "step 2", ...],
        "nutritionalInfo": ["calories: 200", "protein: 5g", ...],
        "mealType": "main course"
      }

      Here is the extracted text from the recipe, with detected food items for context:
      ${rawText}

      Food items detected in image: ${foodLabels.join(", ")}
      `;

      // Call GPT to structure the recipe
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a recipe expert who excels at standardizing measurements and formatting recipes clearly. Your primary focus is on accurate ingredient quantities and clear instructions.",
          },
          {
            role: "user",
            content: gptPrompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      const recipe = JSON.parse(completion.choices[0].message.content);

      // Post-process ingredients to verify exact measurements are preserved
      const processedRecipe = {
        ...recipe,
        ingredients:
          recipe.ingredients?.map((ingredient) => {
            // Verify each preserved measurement appears in the ingredient text
            preservedMeasurements.forEach((measurement) => {
              if (!ingredient.includes(`(${measurement})`)) {
                // If a parenthetical measurement is missing, reinsert it
                const measurementMatch = measurement.match(
                  /(\d+)\s*(oz\.|ounces?|lbs?\.?|pounds?|pkg\.?|packages?)/i
                );
                if (measurementMatch) {
                  const [_, num, unit] = measurementMatch;
                  const searchNum = new RegExp(`\\b${num}\\b`);
                  if (searchNum.test(ingredient)) {
                    ingredient = ingredient.replace(
                      searchNum,
                      `(${measurement})`
                    );
                  }
                }
              }
            });
            return ingredient.trim();
          }) || [],
      };

      // Validate and format the final recipe object
      const validatedRecipe = {
        title: processedRecipe.title || "Untitled Recipe",
        prepTime: processedRecipe.prepTime || "N/A",
        cookTime: processedRecipe.cookTime || "N/A",
        servings: processedRecipe.servings || "4",
        ingredients: processedRecipe.ingredients,
        instructions: processedRecipe.instructions || [],
        nutritionalInfo: processedRecipe.nutritionalInfo || [],
        mealType: processedRecipe.mealType || "main course",
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
  }
);

module.exports = router;
