const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const checkAiActions = require("../middleware/aiActions");
const checkPaywall = require("../middleware/checkPaywall");
const openai = require("../openai");
const pool = require("../db");
const vision = require("@google-cloud/vision");
const client = new vision.ImageAnnotatorClient({
  credentials: {
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  },
});

// Get all shopping list items for the logged-in user
router.get("/", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `
      SELECT 
        sl.*,
        ARRAY_AGG(JSONB_BUILD_OBJECT(
          'id', r.id,
          'title', r.title
        )) as tagged_recipes
      FROM shopping_list sl
      LEFT JOIN shopping_list_recipes slr ON sl.id = slr.shopping_list_item_id
      LEFT JOIN recipes r ON slr.recipe_id = r.id
      WHERE sl.user_id = $1
      GROUP BY sl.id
      ORDER BY sl.created_at DESC
    `,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting shopping list:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new shopping list item
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const shoppingListCount = await pool.query(
      "SELECT COUNT(*) FROM shopping_list WHERE user_id = $1",
      [userId]
    );

    if (shoppingListCount.rows[0].count >= 200) {
      return res.status(400).json({
        message: "Shopping list limit reached. Maximum 200 items allowed.",
      });
    }

    const { item_name, quantity, recipe_ids = [] } = req.body;

    if (!item_name || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Item name and quantity are required" });
    }

    await pool.query("BEGIN");

    // Check for existing item with same name
    const existingItem = await pool.query(
      "SELECT id, quantity FROM shopping_list WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
      [userId, item_name.trim()]
    );

    let result;

    if (existingItem.rows.length > 0) {
      const currentItem = existingItem.rows[0];

      // Add quantities
      const newQuantity = Number(quantity) + Number(currentItem.quantity);

      // Update existing item
      result = await pool.query(
        `UPDATE shopping_list 
         SET quantity = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [newQuantity, currentItem.id, userId]
      );

      // Update recipe associations
      if (recipe_ids.length > 0) {
        // First remove existing associations
        await pool.query(
          "DELETE FROM shopping_list_recipes WHERE shopping_list_item_id = $1",
          [currentItem.id]
        );

        // Add new associations
        const values = recipe_ids
          .map((recipe_id) => `(${currentItem.id}, ${recipe_id})`)
          .join(", ");

        await pool.query(`
          INSERT INTO shopping_list_recipes (shopping_list_item_id, recipe_id)
          VALUES ${values}
        `);
      }
    } else {
      // New item, insert into shopping list
      result = await pool.query(
        `INSERT INTO shopping_list (user_id, item_name, quantity) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [userId, item_name.trim(), quantity]
      );

      // Add recipe associations if any
      if (recipe_ids.length > 0) {
        const values = recipe_ids
          .map((recipe_id) => `(${result.rows[0].id}, ${recipe_id})`)
          .join(", ");

        await pool.query(`
          INSERT INTO shopping_list_recipes (shopping_list_item_id, recipe_id)
          VALUES ${values}
        `);
      }
    }

    // Fetch complete item with recipe associations
    const finalResult = await pool.query(
      `SELECT 
        sl.*,
        ARRAY_AGG(JSONB_BUILD_OBJECT(
          'id', r.id,
          'title', r.title
        )) as tagged_recipes
      FROM shopping_list sl
      LEFT JOIN shopping_list_recipes slr ON sl.id = slr.shopping_list_item_id
      LEFT JOIN recipes r ON slr.recipe_id = r.id
      WHERE sl.id = $1
      GROUP BY sl.id`,
      [result.rows[0].id]
    );

    await pool.query("COMMIT");
    res.status(201).json(finalResult.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error adding shopping list item:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { item_name, quantity, recipe_ids = [] } = req.body;

    if (!item_name || quantity === undefined) {
      return res.status(400).json({
        message: "Item name and quantity are required",
      });
    }

    await pool.query("BEGIN");

    // If quantity is 0 or less, delete the item
    if (Number(quantity) <= 0) {
      await pool.query(
        "DELETE FROM shopping_list WHERE id = $1 AND user_id = $2",
        [itemId, userId]
      );

      await pool.query("COMMIT");
      return res.json({
        message: "Item removed due to zero or negative quantity",
      });
    }

    const result = await pool.query(
      `UPDATE shopping_list 
       SET item_name = $1, quantity = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [item_name.trim(), quantity, itemId, userId]
    );

    if (result.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }

    // Update recipe associations
    await pool.query(
      "DELETE FROM shopping_list_recipes WHERE shopping_list_item_id = $1",
      [itemId]
    );

    if (recipe_ids.length > 0) {
      const values = recipe_ids
        .map((recipe_id) => `(${itemId}, ${recipe_id})`)
        .join(", ");

      await pool.query(`
        INSERT INTO shopping_list_recipes (shopping_list_item_id, recipe_id)
        VALUES ${values}
      `);
    }

    await pool.query("COMMIT");

    // Fetch updated item with recipes
    const updatedResult = await pool.query(
      `
      SELECT 
        sl.*,
        ARRAY_AGG(JSONB_BUILD_OBJECT(
          'id', r.id,
          'title', r.title
        )) as tagged_recipes
      FROM shopping_list sl
      LEFT JOIN shopping_list_recipes slr ON sl.id = slr.shopping_list_item_id
      LEFT JOIN recipes r ON slr.recipe_id = r.id
      WHERE sl.id = $1
      GROUP BY sl.id
    `,
      [itemId]
    );

    res.json(updatedResult.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error updating shopping list item:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// Delete a shopping list item
router.put("/delete/:id", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { quantity } = req.body; // Get incoming quantity

    await pool.query("BEGIN");

    // Get current item
    const currentItem = await pool.query(
      "SELECT quantity FROM shopping_list WHERE id = $1 AND user_id = $2",
      [itemId, userId]
    );

    if (currentItem.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }

    // If incoming quantity is less than current, update instead of delete
    if (Number(quantity) < currentItem.rows[0].quantity) {
      const remainingQty = currentItem.rows[0].quantity - Number(quantity);

      const result = await pool.query(
        `UPDATE shopping_list 
         SET quantity = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [remainingQty, itemId, userId]
      );

      await pool.query("COMMIT");
      return res.json({
        message: "Item quantity updated",
        item: result.rows[0],
      });
    }

    // If incoming quantity is >= current quantity, delete the item
    await pool.query(
      "DELETE FROM shopping_list WHERE id = $1 AND user_id = $2",
      [itemId, userId]
    );

    await pool.query("COMMIT");
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error deleting shopping list item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const determineExpirationDate = (existingDate, newDate) => {
  if (existingDate && newDate) {
    // If both have dates, use the earlier one
    return new Date(existingDate) < new Date(newDate) ? existingDate : newDate;
  }
  // If only one has a date, use that one
  return existingDate || newDate || null;
};

// Add item to inventory and delete from shopping list
router.post(
  "/:id/move-to-inventory",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.params.id;
      let { expiration_date } = req.body;
      // Check current count plus new items won't exceed limit
      const currentCount = await pool.query(
        "SELECT COUNT(*) FROM inventory WHERE user_id = $1",
        [userId]
      );

      if (currentCount.rows[0].count > 200) {
        return res.status(400).json({
          message:
            "Adding these items would exceed the inventory limit of 200 items.",
        });
      }

      if (expiration_date === "") {
        expiration_date = null;
      }

      await pool.query("BEGIN");

      // Get shopping list item
      const shoppingItem = await pool.query(
        "SELECT * FROM shopping_list WHERE id = $1 AND user_id = $2",
        [itemId, userId]
      );

      if (shoppingItem.rows.length === 0) {
        await pool.query("ROLLBACK");
        return res.status(404).json({ message: "Item not found" });
      }

      const item = shoppingItem.rows[0];

      // Check for existing inventory item
      const existingItem = await pool.query(
        "SELECT id, quantity, expiration_date FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, item.item_name]
      );

      if (existingItem.rows.length > 0) {
        const currentItem = existingItem.rows[0];

        // Determine which expiration date to use
        const finalExpirationDate = determineExpirationDate(
          currentItem.expiration_date,
          expiration_date
        );

        // Add quantities
        const newQuantity =
          Number(item.quantity) + Number(currentItem.quantity);

        // Update existing inventory item
        await pool.query(
          `UPDATE inventory 
         SET quantity = $1, expiration_date = $2, updated_at = NOW()
         WHERE id = $3`,
          [newQuantity, finalExpirationDate, currentItem.id]
        );
      } else {
        // Add new inventory item
        await pool.query(
          `INSERT INTO inventory (user_id, item_name, quantity, expiration_date) 
         VALUES ($1, $2, $3, $4)`,
          [userId, item.item_name, item.quantity, expiration_date]
        );
      }

      // Delete from shopping list
      await pool.query("DELETE FROM shopping_list WHERE id = $1", [itemId]);

      await pool.query("COMMIT");
      res.json({ message: "Item moved to inventory successfully" });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error moving item to inventory:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.post(
  "/:item_name/move-to-inventory-by-name",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const item_name = req.params.item_name;
      let { expiration_date } = req.body;
      const inventoryCount = await pool.query(
        "SELECT COUNT(*) FROM inventory WHERE user_id = $1",
        [userId]
      );

      if (inventoryCount.rows[0].count >= 200) {
        return res.status(400).json({
          message: "Inventory limit reached. Maximum 200 items allowed.",
        });
      }

      if (expiration_date === "") {
        expiration_date = null;
      }

      await pool.query("BEGIN");

      // Get shopping list item
      const shoppingItem = await pool.query(
        "SELECT * FROM shopping_list WHERE LOWER(item_name) = LOWER($1) AND user_id = $2",
        [item_name, userId]
      );

      if (shoppingItem.rows.length === 0) {
        await pool.query("ROLLBACK");
        return res.status(404).json({ message: "Item not found" });
      }

      const item = shoppingItem.rows[0];

      // Check for existing inventory item - now including expiration_date
      const existingItem = await pool.query(
        "SELECT id, quantity, expiration_date FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, item_name]
      );

      if (existingItem.rows.length > 0) {
        // Item exists in inventory, add quantities
        const currentItem = existingItem.rows[0];

        // Determine which expiration date to use
        const finalExpirationDate = determineExpirationDate(
          currentItem.expiration_date,
          expiration_date
        );

        // Add quantities
        const newQuantity =
          Number(item.quantity) + Number(currentItem.quantity);

        // Update existing inventory item with expiration date logic
        await pool.query(
          `UPDATE inventory 
           SET quantity = $1, expiration_date = $2, updated_at = NOW()
           WHERE id = $3`,
          [newQuantity, finalExpirationDate, currentItem.id]
        );
      } else {
        // Add new inventory item
        await pool.query(
          `INSERT INTO inventory (user_id, item_name, quantity, expiration_date) 
           VALUES ($1, $2, $3, $4)`,
          [userId, item.item_name, item.quantity, expiration_date]
        );
      }

      // Delete from shopping list
      await pool.query("DELETE FROM shopping_list WHERE id = $1", [item.id]);

      await pool.query("COMMIT");
      res.json({ message: "Item moved to inventory successfully" });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error moving item to inventory:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.post(
  "/process-receipt",
  [authMiddleware, checkAiActions, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { imageData } = req.body;

      const currentCount = await pool.query(
        "SELECT COUNT(*) FROM shopping_list WHERE user_id = $1",
        [userId]
      );

      if (currentCount.rows[0].count >= 200) {
        return res.status(400).json({
          message: "Shopping list limit reached. Maximum 200 items allowed.",
        });
      }

      // Input validation
      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }

      if (!/^data:image\/[a-z]+;base64,/.test(imageData)) {
        return res.status(400).json({ message: "Invalid image data format" });
      }

      const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

      // Get shopping list items first to include in OCR context
      const shoppingListResult = await pool.query(
        `SELECT id, item_name, quantity FROM shopping_list WHERE user_id = $1`,
        [userId]
      );
      const shoppingList = shoppingListResult.rows;

      // Perform OCR with enhanced text detection settings
      const [result] = await client.documentTextDetection({
        image: { content: Buffer.from(base64Image, "base64") },
      });

      const fullText = result.fullTextAnnotation;
      if (!fullText) {
        return res.status(400).json({ message: "No text detected in receipt" });
      }

      // Enhanced receipt line processing with better structure preservation
      const receiptLines = fullText.text.split("\n");

      // Track line relationships and context
      const processedLines = receiptLines.map((line, index) => {
        // Store original line for reference
        const original = line.trim();

        // Basic price detection
        const priceMatch = line.match(/\d+\.\d{2}\b/);
        const price = priceMatch ? priceMatch[0] : null;

        // Quantity detection patterns
        const qtyPatterns = [
          /(\d+)\s*@/, // Standard @ pattern
          /QTY[:\s]*(\d+)/i, // QTY prefix
          /^\s*(\d+)\s+/, // Leading number
          /(\d+)\s*(?:PC|EA|PK|CT)\b/i, // Unit indicators
        ];

        let quantity = null;
        for (const pattern of qtyPatterns) {
          const match = line.match(pattern);
          if (match) {
            quantity = parseInt(match[1]);
            break;
          }
        }

        // Clean item text while preserving important details
        let itemText = line
          .replace(/^[\d\s]+/, "") // Remove leading numbers
          .replace(/\s+@\s+.*$/, "") // Remove @ price indicators
          .replace(/\bQTY\b.*$/i, "") // Remove quantity indicators
          .replace(/\d+\s*(?:PC|EA|PK|CT)\b/i, "") // Remove unit measurements
          .replace(/\d+\.\d{2}\b.*$/, "") // Remove price and anything after
          .replace(/\s{2,}/g, " ") // Normalize spaces
          .trim();

        // Look for brand names or product identifiers (often in CAPS)
        const brandMatch = itemText.match(/[A-Z]{2,}(?:\s+[A-Z]+)*/);
        const brandName = brandMatch ? brandMatch[0] : null;

        return {
          original,
          itemText,
          price,
          quantity,
          brandName,
          lineNumber: index + 1,
        };
      });

      // Enhanced GPT prompt with better context and matching instructions
      const gptPrompt = `You are a receipt analysis expert. Your task is to match receipt items with shopping list items.

RECEIPT CONTEXT:
The receipt appears to be from a store and contains ${
        processedLines.length
      } items.
Here are the detected items with their details:

${processedLines
  .map(
    (line) =>
      `Line ${line.lineNumber}: ${line.original}
   → Cleaned text: "${line.itemText}"
   ${line.brandName ? `→ Brand detected: ${line.brandName}` : ""}
   ${line.quantity ? `→ Quantity: ${line.quantity}` : ""}
   ${line.price ? `→ Price: $${line.price}` : ""}`
  )
  .join("\n\n")}

SHOPPING LIST ITEMS:
${shoppingList
  .map(
    (item) =>
      `ID ${item.id}: ${item.item_name} (Quantity needed: ${item.quantity})`
  )
  .join("\n")}

MATCHING RULES:
1. EXACT MATCHES: Look for exact matches first
2. BRAND MATCHES: Match brand names with generic items (e.g., "KRAFT CHEESE" matches "cheese")
3. PARTIAL MATCHES: Match partial words if they're specific enough (e.g., "yogurt" matches "Greek yogurt")
4. QUANTITY HANDLING:
   - Use detected quantities when available
   - Default to shopping list quantity if no quantity detected

Return a JSON object with this structure:
{
  "matches": [
    {
      "shopping_list_id": number,
      "shopping_list_item": "exact item name from shopping list",
      "receipt_match": "exact line from receipt",
      "quantity": number
    }
  ]
}`;

      // Use GPT-3.5-turbo for consistent, accurate matching
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a receipt analysis expert specializing in accurate item matching and quantity detection. You prioritize accuracy over quantity of matches.",
          },
          {
            role: "user",
            content: gptPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(completion.choices[0].message.content);

      // Enhanced validation with more sophisticated rules
      const validatedMatches = {
        matches: analysis.matches.filter((match) => {
          // Basic field validation
          if (
            !match.shopping_list_id ||
            !match.shopping_list_item ||
            !match.receipt_match ||
            !match.quantity
          ) {
            return false;
          }

          // Verify shopping list item exists
          const validItem = shoppingList.find(
            (item) => item.id === match.shopping_list_id
          );
          if (!validItem) {
            return false;
          }

          // Verify receipt match exists in processed lines
          const validReceipt = processedLines.some(
            (line) =>
              line.original.includes(match.receipt_match) ||
              match.receipt_match.includes(line.itemText)
          );
          if (!validReceipt) {
            return false;
          }

          // Quantity validation
          if (match.quantity <= 0 || match.quantity > validItem.quantity) {
            match.quantity = validItem.quantity;
          }

          return true;
        }),
      };

      res.json(validatedMatches);
    } catch (error) {
      console.error("Error processing receipt:", error);
      if (error.response) {
        return res.status(error.response.status).json({
          message: "Error processing receipt",
          details: error.response.data.message,
        });
      }
      return res.status(500).json({
        message: "Error processing receipt image",
        error: error.message,
      });
    }
  }
);

router.post("/bulk-add", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;
    // Check current count plus new items won't exceed limit
    const currentCount = await pool.query(
      "SELECT COUNT(*) FROM shopping_list WHERE user_id = $1",
      [userId]
    );

    if (currentCount.rows[0].count + items.length > 200) {
      return res.status(400).json({
        message:
          "Adding these items would exceed the shopping list limit of 200 items.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    await pool.query("BEGIN");

    try {
      // Add each item to inventory
      for (const item of items) {
        // Validate required fields
        if (
          !item.shopping_list_item ||
          !item.quantity ||
          !item.shopping_list_id
        ) {
          throw new Error("Invalid item data provided");
        }

        // First verify the shopping list item and get its current quantity
        const shoppingItemResult = await pool.query(
          "SELECT id, quantity FROM shopping_list WHERE id = $1 AND user_id = $2",
          [item.shopping_list_id, userId]
        );

        if (shoppingItemResult.rows.length === 0) {
          throw new Error("Unauthorized access to shopping list item");
        }

        const currentQuantity = shoppingItemResult.rows[0].quantity;
        const requestedQuantity = item.quantity;

        // Add to inventory
        await pool.query(
          `INSERT INTO inventory 
           (user_id, item_name, quantity) 
           VALUES ($1, $2, $3)`,
          [userId, item.shopping_list_item, requestedQuantity]
        );

        // If requested quantity is less than current quantity, update shopping list
        // Otherwise, remove the item entirely
        if (requestedQuantity < currentQuantity) {
          const remainingQuantity = currentQuantity - requestedQuantity;
          await pool.query(
            `UPDATE shopping_list 
             SET quantity = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [remainingQuantity, item.shopping_list_id, userId]
          );
        } else {
          await pool.query(
            "DELETE FROM shopping_list WHERE id = $1 AND user_id = $2",
            [item.shopping_list_id, userId]
          );
        }
      }

      await pool.query("COMMIT");

      res.json({
        message: `Successfully processed ${items.length} items`,
        itemsProcessed: items.length,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error processing inventory update:", error);
    res.status(500).json({
      message: "Error processing inventory update",
      error: error.message,
    });
  }
});

// Add this route to shoppingListRoutes.js

router.put(
  "/update-by-name/:item_name",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const item_name = req.params.item_name;
      const { quantity, recipe_ids = [] } = req.body;

      await pool.query("BEGIN");

      // If quantity is 0 or less, delete the item
      if (Number(quantity) <= 0) {
        await pool.query(
          "DELETE FROM shopping_list WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
          [userId, item_name]
        );

        await pool.query("COMMIT");
        return res.json({
          message: "Item removed due to zero or negative quantity",
        });
      }

      // Update the item
      const result = await pool.query(
        `UPDATE shopping_list 
       SET quantity = $1, updated_at = NOW()
       WHERE user_id = $2 AND LOWER(item_name) = LOWER($3)
       RETURNING *`,
        [quantity, userId, item_name]
      );

      if (result.rows.length === 0) {
        await pool.query("ROLLBACK");
        return res.status(404).json({ message: "Item not found" });
      }

      // Update recipe associations
      if (recipe_ids.length > 0) {
        // First remove old associations
        await pool.query(
          "DELETE FROM shopping_list_recipes WHERE shopping_list_item_id = $1",
          [result.rows[0].id]
        );

        // Add new associations
        const values = recipe_ids
          .map((recipe_id) => `(${result.rows[0].id}, ${recipe_id})`)
          .join(", ");

        await pool.query(`
        INSERT INTO shopping_list_recipes (shopping_list_item_id, recipe_id)
        VALUES ${values}
      `);
      }

      await pool.query("COMMIT");

      // Fetch updated item with recipes
      const updatedResult = await pool.query(
        `
      SELECT 
        sl.*,
        ARRAY_AGG(JSONB_BUILD_OBJECT(
          'id', r.id,
          'title', r.title
        )) as tagged_recipes
      FROM shopping_list sl
      LEFT JOIN shopping_list_recipes slr ON sl.id = slr.shopping_list_item_id
      LEFT JOIN recipes r ON slr.recipe_id = r.id
      WHERE sl.id = $1
      GROUP BY sl.id
    `,
        [result.rows[0].id]
      );

      res.json(updatedResult.rows[0]);
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error updating shopping list item:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// Constants for product categories and exclusions
const PRODUCT_CATEGORIES = [
  "beverages",
  "dairy",
  "produce",
  "meat",
  "pantry",
  "snacks",
  "condiments",
  "baking",
  "canned goods",
];

const EXCLUSION_CATEGORIES = [
  "packaging",
  "plastic",
  "container",
  "brand",
  "logo",
  "label",
  "wrapper",
  "product",
  "material",
  "merchandise",
  "bottle",
  "box",
  "jar",
];

router.post(
  "/analyze-item",
  [authMiddleware, checkAiActions, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
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

      // Get user's shopping list items
      const userItems = await pool.query(
        "SELECT * FROM shopping_list WHERE user_id = $1",
        [userId]
      );

      // Step 1: Run both OCR and Label Detection in parallel
      const [textResult, labelResult] = await Promise.all([
        client.textDetection({
          image: { content: Buffer.from(base64Image, "base64") },
        }),
        client.labelDetection({
          image: { content: Buffer.from(base64Image, "base64") },
        }),
      ]);

      // Step 2: Structure the analysis data
      const imageAnalysis = {
        detectedText: textResult[0].fullTextAnnotation
          ? textResult[0].fullTextAnnotation.text
              .split("\n")
              .filter((text) => text.trim())
              .map((text) => text.toLowerCase())
          : [],
        detectedLabels: labelResult[0].labelAnnotations
          .filter((label) => label.score > 0.3)
          .filter(
            (label) =>
              !EXCLUSION_CATEGORIES.includes(label.description.toLowerCase())
          )
          .map((label) => ({
            name: label.description.toLowerCase(),
            confidence: (label.score * 100).toFixed(1),
          })),
      };

      console.log(imageAnalysis);

      // Calculate confidence score
      const confidenceScore = calculateConfidence(imageAnalysis);

      // If confidence is too low, return early
      if (confidenceScore < 0.3) {
        return res.status(400).json({
          message: "Unable to identify item with sufficient confidence",
          confidence: confidenceScore,
        });
      }

      // Format GPT prompt with all gathered information
      const gptPrompt = `You are analyzing a photo of a food item. You have two separate tasks:

TASK 1 - IDENTIFY THE ITEM:
Using this detected information from the image:
Text found in image: ${imageAnalysis.detectedText.join(", ")}
Visual labels: ${imageAnalysis.detectedLabels
        .map((l) => `${l.name} (${l.confidence}% confidence)`)
        .join(", ")}

Think carefully about all words and labels above, no matter their confidence score:
- What product names, ingredients, or descriptions do you see in the text?
- How do the visual labels support or add context to the text?
- What specific food item would have these characteristics?

Product must fall into one of these categories: ${PRODUCT_CATEGORIES.join(", ")}

Your job is to identify what food item this is. Rules for identification:
1. Must be a specific food item (e.g., "ketchup" not "condiment")
2. Must NOT be any of these items: ${userItems.rows
        .map((item) => item.item_name)
        .join(", ")}
3. Must be a food or beverage item
4. Use the text found in the image as primary identifier if available
5. Use visual labels as secondary confirmation
6. Ignore any labels related to: ${EXCLUSION_CATEGORIES.join(", ")}

TASK 2 - FIND MATCHES:
Based on these image recognition results:
${imageAnalysis.detectedLabels
  .map((l) => `${l.name} (${l.confidence}% confidence)`)
  .join(", ")}

And these shopping list items:
${userItems.rows.map((item) => item.item_name).join("\n")}

Identify the most specific item name and find matches from the shopping list.
Consider common variations and alternative names for grocery items.

Find ANY match, there can and should be more then one. If it's even somewhat similar, it's a match.

Respond with a JSON object in this format:
{
  "itemName": "specific food item name based on rules above",
  "itemCategory": "one of the product categories listed above",
  "confidence": "high/medium/low based on available information",
  "shoppingListMatches": ["potential matches from shopping list"]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a precise food item identification expert. You excel at identifying specific food items from image analysis data.",
          },
          {
            role: "user",
            content: gptPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(completion.choices[0].message.content);

      if (
        !analysis.itemName ||
        !analysis.shoppingListMatches ||
        !analysis.itemCategory
      ) {
        return res
          .status(400)
          .json({ message: "Error parsing item identification" });
      }

      // Verify the identified item category is valid
      if (!PRODUCT_CATEGORIES.includes(analysis.itemCategory.toLowerCase())) {
        return res
          .status(400)
          .json({ message: "Invalid product category identified" });
      }

      // Find actual shopping list items that match
      const matches = userItems.rows.filter((item) =>
        analysis.shoppingListMatches.includes(item.item_name)
      );

      // Return results with confidence information
      res.json({
        exists: matches.length > 0,
        matches,
        suggestedName: analysis.itemName,
        category: analysis.itemCategory,
        confidence: {
          score: confidenceScore,
          level: analysis.confidence,
          textFound: imageAnalysis.detectedText.length > 0,
          labelCount: imageAnalysis.detectedLabels.length,
        },
      });
    } catch (error) {
      console.error("Error analyzing item photo:", error);
      if (error.response) {
        return res.status(error.response.status).json({
          message: error.response.data.message,
        });
      } else {
        return res.status(500).json({
          message: "Error analyzing photo",
          error: error.message,
        });
      }
    }
  }
);

// Helper function to calculate confidence score
function calculateConfidence(analysis) {
  let confidence = 0;

  // Text detection adds significant confidence
  if (analysis.detectedText.length > 0) {
    confidence += 0.5;
  }

  // High confidence labels add confidence
  const highConfidenceLabels = analysis.detectedLabels.filter(
    (l) => parseFloat(l.confidence) > 80
  );
  confidence += highConfidenceLabels.length * 0.1;

  // More labels (up to 5) add some confidence
  confidence += Math.min(analysis.detectedLabels.length * 0.05, 0.25);

  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

// Add multiple items to shopping list
router.post(
  "/bulk-add-shopping",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No items provided" });
      }

      const shoppingListCount = await pool.query(
        "SELECT COUNT(*) FROM shopping_list WHERE user_id = $1",
        [userId]
      );

      if (shoppingListCount.rows[0].count > 200) {
        return res.status(400).json({
          message:
            "Adding these items would exceed the shopping list limit of 200 items.",
        });
      }

      await pool.query("BEGIN");

      // Process each item
      for (const item of items) {
        // Check for existing item with same name
        const existingItem = await pool.query(
          "SELECT id, quantity FROM shopping_list WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
          [userId, item.item_name.trim()]
        );

        if (existingItem.rows.length > 0) {
          // Update existing item quantity
          await pool.query(
            `UPDATE shopping_list 
           SET quantity = quantity + $1, updated_at = NOW()
           WHERE id = $2`,
            [item.quantity, existingItem.rows[0].id]
          );
        } else {
          // Add new item
          await pool.query(
            `INSERT INTO shopping_list (user_id, item_name, quantity) 
           VALUES ($1, $2, $3)`,
            [userId, item.item_name.trim(), item.quantity]
          );
        }
      }

      await pool.query("COMMIT");

      res.json({
        message: `Successfully added ${items.length} items to shopping list`,
        itemsProcessed: items.length,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error processing shopping list update:", error);
      res.status(500).json({
        message: "Error processing shopping list update",
        error: error.message,
      });
    }
  }
);

router.post(
  "/from-inventory/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.params.id;

      await pool.query("BEGIN");

      // Get inventory item
      const inventoryItem = await pool.query(
        "SELECT * FROM inventory WHERE id = $1 AND user_id = $2",
        [itemId, userId]
      );

      if (inventoryItem.rows.length === 0) {
        await pool.query("ROLLBACK");
        return res.status(404).json({ message: "Item not found" });
      }

      const item = inventoryItem.rows[0];

      // Check for existing shopping list item
      const existingItem = await pool.query(
        "SELECT id, quantity FROM shopping_list WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, item.item_name]
      );

      if (existingItem.rows.length > 0) {
        // Update existing shopping list item
        const currentItem = existingItem.rows[0];
        const newQuantity =
          Number(item.quantity) + Number(currentItem.quantity);

        // Update quantity in shopping list
        await pool.query(
          `UPDATE shopping_list 
         SET quantity = $1, updated_at = NOW()
         WHERE id = $2`,
          [newQuantity, currentItem.id]
        );
      } else {
        // Add new shopping list item
        await pool.query(
          `INSERT INTO shopping_list (user_id, item_name, quantity) 
         VALUES ($1, $2, $3)`,
          [userId, item.item_name, item.quantity]
        );
      }

      // Delete from inventory
      await pool.query("DELETE FROM inventory WHERE id = $1", [itemId]);

      await pool.query("COMMIT");
      res.json({ message: "Item moved to shopping list successfully" });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Error moving item to shopping list:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
