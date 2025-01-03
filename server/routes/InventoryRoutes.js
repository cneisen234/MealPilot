const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");

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

// Add a new inventory item
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_name, quantity, unit, expiration_date } = req.body;

    if (!item_name || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Item name and quantity are required" });
    }

    const result = await pool.query(
      `INSERT INTO inventory (user_id, item_name, quantity, unit, expiration_date) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, item_name.trim(), quantity, unit, expiration_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding inventory item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update an inventory item
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { item_name, quantity, unit, expiration_date } = req.body;

    if (!item_name || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Item name and quantity are required" });
    }

    const result = await pool.query(
      `UPDATE inventory 
       SET item_name = $1, quantity = $2, unit = $3, expiration_date = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        item_name.trim(),
        Number(quantity),
        unit,
        expiration_date,
        itemId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete an inventory item
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    const result = await pool.query(
      "DELETE FROM inventory WHERE id = $1 AND user_id = $2 RETURNING id",
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
