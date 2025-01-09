const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const axios = require("axios");
const openai = require("../openai");

router.post("/check-item", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { barcode } = req.body;

    // First get product info from Open Food Facts API
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (!response.data.product?.product_name) {
      return res.status(404).json({ message: "Product not found" });
    }

    const productName = response.data.product.product_name;

    // Get all items from inventory and shopping list at once
    const [inventoryItems, shoppingListItems] = await Promise.all([
      pool.query("SELECT * FROM inventory WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM shopping_list WHERE user_id = $1", [userId]),
    ]);

    const analysisPrompt = `You are performing intelligent product matching but MUST use exact database names in responses.

Database Items (THESE ARE THE ONLY VALID NAMES YOU CAN USE in your matches):
${inventoryItems.rows
  .map(
    (item) => `"${item.item_name}" (id: ${item.id}, quantity: ${item.quantity})`
  )
  .join("\n")}
${shoppingListItems.rows
  .map(
    (item) => `"${item.item_name}" (id: ${item.id}, quantity: ${item.quantity})`
  )
  .join("\n")}

ABSOLUTELY CRITICAL REQUIREMENT:
When finding matches, you MUST USE EXACTLY the database item_name. Do not use any variations or modifications.

Scanned Product: "${productName}"

Return a JSON object with this exact structure:
{
  "matches": [
    {
      "database_name": "exact database item name, character-for-character match",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Rules for matching:
1. The database_name MUST BE EXACTLY as it appears in the database list above
2. Be conservative with matches - if unsure, don't include the match
3. Consider product types carefully (e.g., "fresh lemon" ≠ "lemon juice")
4. Sort matches by confidence
5. Return empty array if no confident matches`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent product matching system that MUST use exact database names in responses. Never modify database names.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    let matchResults;
    try {
      matchResults = JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error("Error parsing GPT response:", error);
      return res
        .status(500)
        .json({ message: "Error processing product matches" });
    }

    if (!matchResults.matches || !Array.isArray(matchResults.matches)) {
      return res.status(500).json({ message: "Invalid match format returned" });
    }

    // Filter matches to only high and medium confidence
    const validMatches = matchResults.matches.filter((m) =>
      ["high", "medium"].includes(m.confidence.toLowerCase())
    );

    if (validMatches.length > 0) {
      // Get the matched items from our original query results
      const matchedNames = new Set(
        validMatches.map((m) => m.database_name.toLowerCase())
      );

      const allMatches = [
        ...inventoryItems.rows
          .filter((item) => matchedNames.has(item.item_name.toLowerCase()))
          .map((item) => ({ ...item, source: "inventory" })),
        ...shoppingListItems.rows
          .filter((item) => matchedNames.has(item.item_name.toLowerCase()))
          .map((item) => ({ ...item, source: "shopping_list" })),
      ];

      if (allMatches.length === 1) {
        // Single match
        const match = allMatches[0];
        res.json({
          item_name: match.item_name, // Use exact database name
          barcode: barcode,
          inInventory: match.source === "inventory",
          inShoppingList: match.source === "shopping_list",
          inventoryItem: match.source === "inventory" ? match : null,
          shoppingListItem: match.source === "shopping_list" ? match : null,
          multipleMatches: false,
          matches: [],
        });
      } else if (allMatches.length > 1) {
        // Multiple matches
        res.json({
          item_name: productName,
          barcode: barcode,
          inInventory: allMatches.some((m) => m.source === "inventory"),
          inShoppingList: allMatches.some((m) => m.source === "shopping_list"),
          inventoryItem: null,
          shoppingListItem: null,
          multipleMatches: true,
          matches: allMatches,
        });
      } else {
        // No matches found despite GPT suggestions
        res.json({
          item_name: productName,
          barcode: barcode,
          inInventory: false,
          inShoppingList: false,
          inventoryItem: null,
          shoppingListItem: null,
          multipleMatches: false,
          matches: [],
        });
      }
    } else {
      // No matches found
      res.json({
        item_name: productName,
        barcode: barcode,
        inInventory: false,
        inShoppingList: false,
        inventoryItem: null,
        shoppingListItem: null,
        multipleMatches: false,
        matches: [],
      });
    }
  } catch (error) {
    console.error("Error checking item:", error);
    res.status(500).json({
      message: "Error checking item",
      error: error.message,
    });
  }
});

module.exports = router;
