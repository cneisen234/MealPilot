const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
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
router.get("/", authMiddleware, async (req, res) => {
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

router.put("/:id", authMiddleware, async (req, res) => {
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
router.put("/delete/:id", authMiddleware, async (req, res) => {
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
router.post("/:id/move-to-inventory", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    let { expiration_date } = req.body;
    // Check current count plus new items won't exceed limit
    const currentCount = await pool.query(
      "SELECT COUNT(*) FROM inventory WHERE user_id = $1",
      [userId]
    );

    if (currentCount.rows[0].count + items.length > 200) {
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
      const newQuantity = Number(item.quantity) + Number(currentItem.quantity);

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
});

router.post(
  "/:item_name/move-to-inventory-by-name",
  authMiddleware,
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

router.post("/add-from-receipt", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;

    // Check current count plus new items won't exceed limit
    const currentCount = await pool.query(
      "SELECT COUNT(*) FROM inventory WHERE user_id = $1",
      [userId]
    );

    if (currentCount.rows[0].count + items.length > 200) {
      return res.status(400).json({
        message:
          "Adding these items would exceed the inventory limit of 200 items.",
      });
    }

    await pool.query("BEGIN");

    let processedItems = 0;

    for (const item of items) {
      const existingItem = await pool.query(
        "SELECT id, quantity, expiration_date FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, item.shopping_list_item]
      );

      if (existingItem.rows.length > 0) {
        const currentItem = existingItem.rows[0];

        // For receipt items, we might want to use the existing expiration date if present
        const finalExpirationDate = currentItem.expiration_date || null;

        const newQuantity =
          Number(item.quantity) + Number(currentItem.quantity);

        await pool.query(
          `UPDATE inventory 
           SET quantity = $1, expiration_date = $2, updated_at = NOW()
           WHERE id = $3`,
          [newQuantity, finalExpirationDate, currentItem.id]
        );
      } else {
        // Add new inventory item (receipt items typically won't have expiration dates)
        await pool.query(
          `INSERT INTO inventory 
           (user_id, item_name, quantity) 
           VALUES ($1, $2, $3)`,
          [userId, item.shopping_list_item, item.quantity]
        );
      }

      await pool.query(
        "DELETE FROM shopping_list WHERE id = $1 AND user_id = $2",
        [item.shopping_list_id, userId]
      );

      processedItems++;
    }

    await pool.query("COMMIT");

    res.json({
      message: `Successfully added ${processedItems} items to inventory`,
      itemsProcessed: processedItems,
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error adding items to inventory:", error);
    res.status(500).json({
      message: "Error processing inventory update",
      error: error.message,
    });
  }
});

router.post("/process-receipt", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageData } = req.body;

    const currentCount = await pool.query(
      "SELECT COUNT(*) FROM shopping_list WHERE user_id = $1",
      [userId]
    );

    // Since we don't know how many items will be found, we should ensure there's room
    if (currentCount.rows[0].count >= 200) {
      return res.status(400).json({
        message: "Shopping list limit reached. Maximum 200 items allowed.",
      });
    }

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
    const shoppingListResult = await pool.query(
      `SELECT id, item_name, quantity FROM shopping_list WHERE user_id = $1`,
      [userId]
    );
    const shoppingList = shoppingListResult.rows;

    // 1. Use Google Vision API for text detection (OCR)
    const [result] = await client.documentTextDetection({
      image: { content: Buffer.from(base64Image, "base64") },
    });

    const fullText = result.fullTextAnnotation;
    if (!fullText) {
      return res.status(400).json({ message: "No text detected in receipt" });
    }

    // 2. Extract structured data from the text
    // Get each line from the OCR result
    const receiptLines = fullText.text.split("\n");

    // Pre-process receipt lines to extract potential items and prices
    const receiptItems = receiptLines
      .map((line) => {
        // Common receipt item patterns
        const pricePattern = /\d+\.\d{2}/; // Matches prices like 12.99
        const price = line.match(pricePattern)?.[0];

        // Remove price and common receipt prefixes/suffixes
        let itemText = line
          .replace(pricePattern, "")
          .replace(/^[0-9]+\s/, "") // Remove leading numbers
          .replace(/\s+@\s+.*$/, "") // Remove @ price indicators
          .trim();

        return {
          text: itemText,
          price: price,
        };
      })
      .filter((item) => item.text && item.text.length > 1); // Filter out empty or single-char lines

    // 3. Use GPT to match receipt items with shopping list
    const gptPrompt = `Given these receipt items:
${receiptItems
  .map((item) => `${item.text} - $${item.price || "N/A"}`)
  .join("\n")}

And these shopping list items:
${shoppingList
  .map(
    (item) => `ID ${item.id}: ${item.item_name} (Quantity: ${item.quantity})`
  )
  .join("\n")}

Find matches between the receipt items and shopping list items.
Be conservative - only match items that are clearly the same product.
Consider common variations in product names and abbreviations.

Return a JSON object with this structure:
{
  "matches": [
    {
      "shopping_list_id": number,
      "shopping_list_item": "item name from shopping list",
      "receipt_match": "exact text found on receipt",
      "quantity": number
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a receipt analysis expert that specializes in matching shopping list items with receipt entries. Be precise and conservative in making matches.",
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

    // 4. Validate and clean up matches
    const validatedMatches = {
      matches: analysis.matches.filter((match) => {
        // Ensure all required fields are present
        if (
          !match.shopping_list_id ||
          !match.shopping_list_item ||
          !match.receipt_match ||
          !match.quantity
        ) {
          return false;
        }

        // Verify shopping_list_id exists in original shopping list
        const validItem = shoppingList.find(
          (item) => item.id === match.shopping_list_id
        );
        if (!validItem) {
          return false;
        }

        // Verify quantity is reasonable (not zero or negative)
        if (match.quantity <= 0) {
          match.quantity = validItem.quantity; // Use original quantity if invalid
        }

        return true;
      }),
    };

    // 5. Return the processed matches
    res.json(validatedMatches);
  } catch (error) {
    console.error("Error processing receipt:", error);
    // Handle specific types of errors
    if (error.response) {
      // API-specific errors (Google Vision or OpenAI)
      return res.status(error.response.status).json({
        message: "Error processing receipt",
        details: error.response.data.message,
      });
    } else {
      // Other errors (network, parsing, etc.)
      return res.status(500).json({
        message: "Error processing receipt image",
        error: error.message,
      });
    }
  }
});

router.post("/bulk-add", authMiddleware, async (req, res) => {
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

router.put("/update-by-name/:item_name", authMiddleware, async (req, res) => {
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
});

router.post("/analyze-item", authMiddleware, async (req, res) => {
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

    // 1. Use Google Vision API for image analysis
    const [result] = await client.labelDetection({
      image: { content: Buffer.from(base64Image, "base64") },
    });

    const labels = result.labelAnnotations;

    if (!labels || labels.length === 0) {
      return res
        .status(400)
        .json({ message: "No labels detected in the image" });
    }

    // Filter for high-confidence labels (above 30%)
    const concepts = labels
      .filter((label) => label.score > 0.3)
      .map((label) => ({
        name: label.description,
        confidence: (label.score * 100).toFixed(1),
      }));

    if (concepts.length === 0) {
      return res.status(400).json({ message: "No relevant concepts detected" });
    }

    // 2. Use GPT to analyze Vision API results and find shopping list matches
    const gptPrompt = `Based on these image recognition results:
${concepts.map((c) => `${c.name} (${c.confidence}% confidence)`).join("\n")}

And these shopping list items:
${userItems.rows.map((item) => item.item_name).join("\n")}

Identify the most specific item name and find matches from the shopping list.
Consider common variations and alternative names for grocery items.

Return a JSON object with this structure:
{
  "itemName": "most specific item name",
  "shoppingListMatches": ["exact", "matches", "from", "shopping list"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a precise shopping list matching expert.",
        },
        {
          role: "user",
          content: gptPrompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    if (!analysis.itemName || !analysis.shoppingListMatches) {
      return res.status(400).json({ message: "Error parsing GPT response" });
    }

    // 3. Find actual shopping list items that match
    const matches = userItems.rows.filter((item) =>
      analysis.shoppingListMatches.includes(item.item_name)
    );

    // Return results
    res.json({
      exists: matches.length > 0,
      matches,
      suggestedName: analysis.itemName,
    });
  } catch (error) {
    console.error("Error analyzing item photo:", error);
    if (error.response) {
      // Handle API-specific errors
      return res.status(error.response.status).json({
        message: error.response.data.message,
      });
    } else {
      // Handle other errors (network, parsing, etc.)
      return res.status(500).json({
        message: "Error analyzing photo",
        error: error.message,
      });
    }
  }
});

module.exports = router;
