const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const openai = require("../openai");
const pool = require("../db");

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
    const { item_name, quantity, unit, recipe_ids = [] } = req.body;

    if (!item_name || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Item name and quantity are required" });
    }

    // Start transaction
    await pool.query("BEGIN");

    // Insert shopping list item
    const itemResult = await pool.query(
      `INSERT INTO shopping_list (user_id, item_name, quantity, unit) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, item_name.trim(), quantity, unit]
    );

    const newItem = itemResult.rows[0];

    // Add recipe associations if any
    if (recipe_ids.length > 0) {
      const values = recipe_ids
        .map((recipe_id) => `(${newItem.id}, ${recipe_id})`)
        .join(", ");

      await pool.query(`
        INSERT INTO shopping_list_recipes (shopping_list_item_id, recipe_id)
        VALUES ${values}
      `);
    }

    await pool.query("COMMIT");

    // Fetch the complete item with recipe associations
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
      WHERE sl.id = $1
      GROUP BY sl.id
    `,
      [newItem.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error adding shopping list item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a shopping list item
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { item_name, quantity, unit, recipe_ids = [] } = req.body;

    if (!item_name || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Item name and quantity are required" });
    }

    await pool.query("BEGIN");

    // Update item
    const result = await pool.query(
      `UPDATE shopping_list 
       SET item_name = $1, quantity = $2, unit = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [item_name.trim(), quantity, unit, itemId, userId]
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
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a shopping list item
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    const result = await pool.query(
      "DELETE FROM shopping_list WHERE id = $1 AND user_id = $2 RETURNING id",
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting shopping list item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add item to inventory and delete from shopping list
router.post("/:id/move-to-inventory", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { expiration_date } = req.body;

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

    // Add to inventory
    await pool.query(
      `INSERT INTO inventory (user_id, item_name, quantity, unit, expiration_date) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, item.item_name, item.quantity, item.unit, expiration_date]
    );

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

// Add to shoppingListRoutes.js

router.post("/process-receipt", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageData } = req.body;

    // First get user's shopping list items
    const shoppingListResult = await pool.query(
      `SELECT id, item_name, quantity, unit FROM shopping_list WHERE user_id = $1`,
      [userId]
    );
    const shoppingList = shoppingListResult.rows;

    // Convert shopping list to a format that's easy for the AI to reference
    const shoppingListItems = shoppingList.map((item) => ({
      id: item.id,
      name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
    }));

    // Prepare prompt for GPT-4
    const prompt = `Analyze this receipt image and identify any items that match or closely match these shopping list items:
    ${JSON.stringify(shoppingListItems)}
    
    For example, if the shopping list has "milk" and the receipt shows "2% MILK", that's a match.
    
    Return a JSON array of matched items in this format:
    {
      "matches": [
        {
          "shopping_list_id": [id from shopping list],
          "shopping_list_item": "original item name",
          "receipt_match": "text as shown on receipt",
          "quantity": [quantity from shopping list],
          "unit": [unit from shopping list]
        }
      ]
    }

    Only include items that are clear matches or very close matches.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a receipt analysis expert that identifies shopping list items in receipt images.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
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

    const matches = JSON.parse(completion.choices[0].message.content);
    res.json(matches);
  } catch (error) {
    console.error("Error processing receipt:", error);
    res.status(500).json({
      message: "Error processing receipt image",
      error: error.message,
    });
  }
});

router.post("/add-from-reciept", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;

    await pool.query("BEGIN");

    try {
      // Add each item to inventory
      for (const item of items) {
        await pool.query(
          `INSERT INTO inventory 
          (user_id, item_name, quantity, unit) 
          VALUES ($1, $2, $3, $4)`,
          [userId, item.shopping_list_item, item.quantity, item.unit]
        );

        // Remove from shopping list
        await pool.query(
          "DELETE FROM shopping_list WHERE id = $1 AND user_id = $2",
          [item.shopping_list_id, userId]
        );
      }

      await pool.query("COMMIT");

      res.json({
        message: `Successfully added ${items.length} items to inventory`,
        itemsProcessed: items.length,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error adding items to inventory:", error);
    res.status(500).json({
      message: "Error processing inventory update",
      error: error.message,
    });
  }
});

module.exports = router;
