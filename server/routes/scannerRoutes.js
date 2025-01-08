const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");

router.post("/check-item", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { barcode } = req.body;

    console.log(barcode);
    //https://world.openfoodfacts.org/api/v0/product/014668340019.json

    // Get item info from barcode using similar prompt structure to recipe generation
    const prompt = `Given this barcode: ${barcode}, return a JSON object with the product information in this exact format:
      {
        "item_name": "product name in plain text, lowercase",
        "expiration_date": "YYYY-MM-DD or null if not applicable",
        "barcode": "original barcode"
      }
      
      If you cannot identify the product, return {"item_name": null, "expiration_date": null, "barcode": "${barcode}"}

      Remember:
      - item_name should be lowercase and simple (e.g., "milk" not "Organic Whole Milk")
      - expiration_date should be null if not applicable
      - barcode should be the original input value`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a product database expert that identifies products from barcodes. Always return properly formatted JSON with lowercase product names.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    let productInfo;
    console.log(completion.choices[0].message.content);
    try {
      productInfo = JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error("Error parsing GPT response:", error);
      return res.status(500).json({ message: "Error processing barcode" });
    }

    if (!productInfo || !productInfo.item_name) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check inventory and shopping list in parallel, similar to recipe inventory check
    const [inventoryResult, shoppingListResult] = await Promise.all([
      pool.query(
        "SELECT * FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, productInfo.item_name]
      ),
      pool.query(
        "SELECT * FROM shopping_list WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, productInfo.item_name]
      ),
    ]);

    res.json({
      ...productInfo,
      inInventory: inventoryResult.rows.length > 0,
      inShoppingList: shoppingListResult.rows.length > 0,
      inventoryItem: inventoryResult.rows[0] || null,
      shoppingListItem: shoppingListResult.rows[0] || null,
    });
  } catch (error) {
    console.error("Error checking item:", error);
    res.status(500).json({
      message: "Error checking item",
      error: error.message,
    });
  }
});

module.exports = router;
