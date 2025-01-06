const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const openai = require("../openai");
const pool = require("../db");
const { convertToStandardUnit } = require("../utils/measurementUtils");

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

    const standardized = convertToStandardUnit(quantity, unit);

    await pool.query("BEGIN");

    // Insert shopping list item
    const itemResult = await pool.query(
      `INSERT INTO shopping_list (user_id, item_name, quantity, unit) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, item_name.trim(), standardized.value, standardized.unit]
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

    // Fetch complete item with recipe associations
    const result = await pool.query(
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
      [newItem.id]
    );

    res.status(201).json(result.rows[0]);
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
    const { item_name, quantity, unit, recipe_ids = [] } = req.body;

    if (!item_name || quantity === undefined) {
      return res.status(400).json({
        message: "Item name and quantity are required",
      });
    }

    await pool.query("BEGIN");

    // Standardize the quantity first
    const standardized = convertToStandardUnit(quantity, unit);

    // If quantity is 0 or less, delete the item
    if (standardized.value <= 0) {
      await pool.query(
        "DELETE FROM shopping_list WHERE id = $1 AND user_id = $2",
        [itemId, userId]
      );

      await pool.query("COMMIT");
      return res.json({
        message: "Item removed due to zero or negative quantity",
      });
    }

    // Update item with standardized quantity
    const result = await pool.query(
      `UPDATE shopping_list 
       SET item_name = $1, quantity = $2, unit = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [item_name.trim(), standardized.value, standardized.unit, itemId, userId]
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
    const { quantity, unit } = req.body; // Get incoming quantity and unit

    await pool.query("BEGIN");

    // Get current item
    const currentItem = await pool.query(
      "SELECT quantity, unit FROM shopping_list WHERE id = $1 AND user_id = $2",
      [itemId, userId]
    );

    if (currentItem.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }

    // Standardize both quantities for comparison
    const incomingStandard = convertToStandardUnit(quantity, unit);
    const currentStandard = convertToStandardUnit(
      currentItem.rows[0].quantity,
      currentItem.rows[0].unit
    );

    // Verify units are compatible
    if (incomingStandard.unit !== currentStandard.unit) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        message: "Incompatible unit types for comparison",
      });
    }

    // If incoming quantity is less than current, update instead of delete
    if (incomingStandard.value < currentStandard.value) {
      const remainingQty = currentStandard.value - incomingStandard.value;

      const result = await pool.query(
        `UPDATE shopping_list 
         SET quantity = $1, unit = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [remainingQty, currentStandard.unit, itemId, userId]
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
      "SELECT id, quantity, unit, expiration_date FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
      [userId, item.item_name]
    );

    if (existingItem.rows.length > 0) {
      const currentItem = existingItem.rows[0];
      const shoppingStandard = convertToStandardUnit(item.quantity, item.unit);
      const inventoryStandard = convertToStandardUnit(
        currentItem.quantity,
        currentItem.unit
      );

      if (shoppingStandard.unit !== inventoryStandard.unit) {
        await pool.query("ROLLBACK");
        return res.status(400).json({
          message: "Cannot combine items with different unit types",
        });
      }

      // Determine which expiration date to use
      const finalExpirationDate = determineExpirationDate(
        currentItem.expiration_date,
        expiration_date
      );

      // Add quantities
      const newQuantity = shoppingStandard.value + inventoryStandard.value;

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
        `INSERT INTO inventory (user_id, item_name, quantity, unit, expiration_date) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, item.item_name, item.quantity, item.unit, expiration_date]
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
        "SELECT id, quantity, unit, expiration_date FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, item_name]
      );

      if (existingItem.rows.length > 0) {
        // Item exists in inventory, add quantities
        const currentItem = existingItem.rows[0];

        // Both items should already be in standardized units, but let's verify
        const shoppingStandard = convertToStandardUnit(
          item.quantity,
          item.unit
        );
        const inventoryStandard = convertToStandardUnit(
          currentItem.quantity,
          currentItem.unit
        );

        // Verify units are compatible
        if (shoppingStandard.unit !== inventoryStandard.unit) {
          await pool.query("ROLLBACK");
          return res.status(400).json({
            message: "Cannot combine items with different unit types",
          });
        }

        // Determine which expiration date to use
        const finalExpirationDate = determineExpirationDate(
          currentItem.expiration_date,
          expiration_date
        );

        // Add quantities
        const newQuantity = shoppingStandard.value + inventoryStandard.value;

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
          `INSERT INTO inventory (user_id, item_name, quantity, unit, expiration_date) 
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, item.item_name, item.quantity, item.unit, expiration_date]
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

    await pool.query("BEGIN");

    let processedItems = 0;

    for (const item of items) {
      const existingItem = await pool.query(
        "SELECT id, quantity, unit, expiration_date FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, item.shopping_list_item]
      );

      const standardized = convertToStandardUnit(item.quantity, item.unit);

      if (existingItem.rows.length > 0) {
        const currentItem = existingItem.rows[0];
        const currentStandard = convertToStandardUnit(
          currentItem.quantity,
          currentItem.unit
        );

        if (standardized.unit !== currentStandard.unit) {
          console.warn(
            `Skipping item ${item.shopping_list_item} due to incompatible units`
          );
          continue;
        }

        // For receipt items, we might want to use the existing expiration date if present
        const finalExpirationDate = currentItem.expiration_date || null;

        const newQuantity = standardized.value + currentStandard.value;

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
           (user_id, item_name, quantity, unit) 
           VALUES ($1, $2, $3, $4)`,
          [
            userId,
            item.shopping_list_item,
            standardized.value,
            standardized.unit,
          ]
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

router.post("/bulk-add", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;

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
          !item.unit ||
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
           (user_id, item_name, quantity, unit) 
           VALUES ($1, $2, $3, $4)`,
          [userId, item.shopping_list_item, requestedQuantity, item.unit]
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

module.exports = router;
