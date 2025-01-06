const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const { convertToStandardUnit } = require("../utils/measurementUtils");

// Get all inventory items for the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT * FROM inventory WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting inventory:", error);
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

// Regular inventory POST route
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_name, quantity, unit } = req.body;
    let { expiration_date } = req.body;

    if (expiration_date === "") {
      expiration_date = null;
    }

    if (!item_name || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Item name and quantity are required" });
    }

    await pool.query("BEGIN");

    const standardized = convertToStandardUnit(quantity, unit);

    // Check for existing item with same name
    const existingItem = await pool.query(
      "SELECT id, quantity, unit, expiration_date FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
      [userId, item_name.trim()]
    );

    let result;

    if (existingItem.rows.length > 0) {
      const currentItem = existingItem.rows[0];
      const currentStandard = convertToStandardUnit(
        currentItem.quantity,
        currentItem.unit
      );

      if (standardized.unit !== currentStandard.unit) {
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

      // Add quantities and update with appropriate expiration date
      const newQuantity = standardized.value + currentStandard.value;

      result = await pool.query(
        `UPDATE inventory 
         SET quantity = $1, expiration_date = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [newQuantity, finalExpirationDate, currentItem.id, userId]
      );
    } else {
      // New item, insert with provided expiration date
      result = await pool.query(
        `INSERT INTO inventory (user_id, item_name, quantity, unit, expiration_date) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          userId,
          item_name.trim(),
          standardized.value,
          standardized.unit,
          expiration_date,
        ]
      );
    }

    await pool.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error adding inventory item:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update an inventory item
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { item_name, quantity, unit } = req.body;
    let { expiration_date } = req.body;

    if (expiration_date === "" || expiration_date === "NaN-NaN-NaN") {
      expiration_date = null;
    }

    if (!item_name || quantity === undefined) {
      return res.status(400).json({
        message: "Item name and quantity are required",
      });
    }

    await pool.query("BEGIN");

    // Standardize the quantity
    const standardized = convertToStandardUnit(quantity, unit);

    // If quantity is 0 or less, delete the item
    if (standardized.value <= 0) {
      await pool.query("DELETE FROM inventory WHERE id = $1 AND user_id = $2", [
        itemId,
        userId,
      ]);

      await pool.query("COMMIT");
      return res.json({
        message: "Item removed due to zero or negative quantity",
      });
    }

    // Update item with standardized quantity
    const result = await pool.query(
      `UPDATE inventory 
       SET item_name = $1, 
           quantity = $2, 
           unit = $3, 
           expiration_date = $4, 
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        item_name.trim(),
        standardized.value,
        standardized.unit,
        expiration_date,
        itemId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }

    await pool.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error updating inventory item:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// Delete an inventory item
router.put("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { quantity, unit } = req.body; // Get incoming quantity and unit

    await pool.query("BEGIN");

    // Get current item
    const currentItem = await pool.query(
      "SELECT quantity, unit FROM inventory WHERE id = $1 AND user_id = $2",
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
        `UPDATE inventory 
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
    await pool.query("DELETE FROM inventory WHERE id = $1 AND user_id = $2", [
      itemId,
      userId,
    ]);

    await pool.query("COMMIT");
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error deleting inventory item:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
