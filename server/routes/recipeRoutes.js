const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const checkAiActions = require("../middleware/aiActions");
const checkPaywall = require("../middleware/checkPaywall");
const pool = require("../db");
const openai = require("../openai");
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

// Helper to parse ingredient strings
// Helper function to parse ingredient strings more comprehensively
const parseIngredientString = (ingredientStr) => {
  // Match complex patterns like "2 cups flour" or "1.5 tablespoons olive oil"
  const fullRegex =
    /^([\d./\s]+)\s*(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|ml|milliliter|milliliters|pinch|pinches)s?\s+(.+)$/i;

  // Match fraction patterns
  const fractionRegex = /(\d+\/\d+|\d+\s+\d+\/\d+)/g;

  // First, standardize fractions
  const standardizedStr = ingredientStr.replace(fractionRegex, (match) => {
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

  // Now try to match the full pattern
  const match = standardizedStr.match(fullRegex);

  if (!match) {
    // If no match, this might be an ingredient without measurement
    // or an improperly formatted string
    return {
      original: ingredientStr,
      quantity: "1",
      unit: "",
      ingredient: ingredientStr.trim(),
    };
  }

  const [, quantity, unit, ingredient] = match;

  // Standardize units
  const standardizedUnit = standardizeUnit(unit.toLowerCase());

  return {
    original: ingredientStr,
    quantity: quantity.trim(),
    unit: standardizedUnit,
    ingredient: ingredient.trim(),
  };
};

// Helper function to standardize units
const standardizeUnit = (unit) => {
  const unitMappings = {
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    tbsp: "tbsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
    tsp: "tsp",
    cup: "cup",
    cups: "cup",
    pound: "lb",
    pounds: "lb",
    lb: "lb",
    lbs: "lb",
    ounce: "oz",
    ounces: "oz",
    oz: "oz",
    gram: "g",
    grams: "g",
    g: "g",
    milliliter: "ml",
    milliliters: "ml",
    ml: "ml",
    pinch: "pinch",
    pinches: "pinch",
  };

  return unitMappings[unit] || unit;
};

router.post(
  "/create-recipe",
  [authMiddleware, checkAiActions, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { mealType, servings } = req.body; // Add servings to destructuring

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
        pool.query("SELECT item FROM dietary_goals WHERE user_id = $1", [
          userId,
        ]),
        pool.query("SELECT item FROM cuisine_preferences WHERE user_id = $1", [
          userId,
        ]),
      ]);

      const user = userQuery.rows[0];
      const existingRecipes = recipesQuery.rows.map((recipe) => recipe.title);
      const cantHaves = cantHavesQuery.rows.map((row) => row.item);
      const mustHaves = mustHavesQuery.rows.map((row) => row.item);
      const tastePreferences = tastePreferencesQuery.rows.map(
        (row) => row.item
      );
      const dietaryGoals = dietaryGoalsQuery.rows.map((row) => row.item);
      const cuisinePreferences = cuisinePreferencesQuery.rows.map(
        (row) => row.item
      );

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
        ), 1)))
        AND title NOT IN (SELECT unnest($8::text[]));`,
        [
          mealType || "meal",
          threeDaysAgo.toISOString(),
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

          // Adjust nutritional info proportionally
          recipe.nutritionalInfo = recipe.nutritionalInfo.map((info) => {
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
      let prompt = `Generate a detailed recipe for ${
        user.name
      }. This should be a ${mealType || "meal"} recipe for ${
        servings || "4"
      } servings.`;

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
Prep Time: [Exact time in minutes, e.g. "20 minutes"]
Cook Time: [Exact time in minutes, e.g. "30 minutes"]
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
- Fiber: [number]g
- Sodium: [number]mg

IMPORTANT: All fields must be included and properly formatted as shown above, especially the prep time, cook time, and complete nutritional information.`;

      // Generate recipe using OpenAI
      const completion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 1.0,
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

        // Case 1: If either is a single generic word (e.g., just "milk"),
        // match it with any ingredient containing that word
        if (
          itemWords.length === 1 &&
          genericIngredientWords.has(itemWords[0])
        ) {
          return inventoryWords.includes(itemWords[0]);
        }
        if (
          inventoryWords.length === 1 &&
          genericIngredientWords.has(inventoryWords[0])
        ) {
          return itemWords.includes(inventoryWords[0]);
        }

        // Case 2: For multi-word items, check if one item is a subset of the other
        const commonGenericWords = itemWords.filter(
          (word) =>
            genericIngredientWords.has(word) && inventoryWords.includes(word)
        );

        if (commonGenericWords.length > 0) {
          const itemSet = new Set(itemWords);
          const inventorySet = new Set(inventoryWords);

          if (itemWords.length < inventoryWords.length) {
            return itemWords.every((word) => inventorySet.has(word));
          } else {
            return inventoryWords.every((word) => itemSet.has(word));
          }
        }

        // Case 3: For all other cases, match on non-generic words
        const itemNonGenericWords = itemWords.filter(
          (word) => !genericIngredientWords.has(word)
        );
        const inventoryNonGenericWords = inventoryWords.filter(
          (word) => !genericIngredientWords.has(word)
        );

        return itemNonGenericWords.some((word) =>
          inventoryNonGenericWords.includes(word)
        );
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

      const prompt = `Extract recipe information from this webpage content and format it as a JSON object. The webpage is from ${url}.

    Return a JSON object with exactly this structure:
    {
      "title": "Recipe title",
      "prepTime": "30 minutes",
      "cookTime": "45 minutes",
      "servings": "4",
        "ingredients": [
    "Include complete ingredient descriptions with measurements and names, like:",
    "2 cups all-purpose flour",
    "1.5 tablespoons olive oil",
    "1/2 teaspoon salt"
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
        model: "deepseek-chat",
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

          // Only return a formatted string if we have all components
          if (parsed.quantity && parsed.ingredient) {
            return `${parsed.quantity}${
              parsed.unit ? ` ${parsed.unit} ` : " "
            }${parsed.ingredient}`;
          }
          return ingredient;
        } catch (error) {
          console.error(`Error parsing ingredient: ${ingredient}`, error);
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
2. For ingredients, ALWAYS include quantity and measurement unit for each ingredient. For example:
   - "2 cups flour"
   - "1 tablespoon butter"
   - "3 large eggs"
   If no specific measurement exists, use numeric quantities like "1 onion" or "2 cloves"
3. Format instructions into clear, numbered steps
4. Identify the meal type based on ingredients and context
5. Extract exact prep/cook times and servings from meta information
6. Organize nutritional info into clear bullet points

Return a JSON object with exactly this structure:
{
  "title": "Recipe title",
  "prepTime": "30 minutes",
  "cookTime": "45 minutes",
  "servings": "4",
  "ingredients": [
    "2 cups all-purpose flour",
    "1.5 tablespoons olive oil",
    "1/2 teaspoon salt"
  ],
  "instructions": ["array of strings"],
  "nutritionalInfo": ["array of strings"],
  "mealType": "string (breakfast/lunch/dinner/dessert/etc)"
}`;

      const completion = await openai.chat.completions.create({
        model: "deepseek-chat",
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
          const parsed = parseIngredientString(ingredient);
          if (!parsed) return ingredient;

          // Match the web scraper's format exactly
          if (parsed.quantity && parsed.ingredient) {
            return `${parsed.quantity}${
              parsed.unit ? ` ${parsed.unit} ` : " "
            }${parsed.ingredient}`;
          }
          return ingredient;
        } catch (error) {
          console.error(`Error parsing ingredient: ${ingredient}`, error);
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
  }
);

module.exports = router;
