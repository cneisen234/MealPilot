const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middleware/auth");

// Get all can't haves for the logged-in user
router.get("/cant-haves", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, item FROM cant_haves WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting cant_haves:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new can't have
router.post("/cant-haves", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item } = req.body;

    if (!item || item.trim() === "") {
      return res.status(400).json({ message: "Item is required" });
    }

    const result = await pool.query(
      "INSERT INTO cant_haves (user_id, item) VALUES ($1, $2) RETURNING id, item",
      [userId, item.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res
        .status(400)
        .json({ message: "This item is already in your can't haves list" });
    }
    console.error("Error adding cant_have:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a can't have
router.delete("/cant-haves/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    const result = await pool.query(
      "DELETE FROM cant_haves WHERE id = $1 AND user_id = $2 RETURNING id",
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item removed successfully" });
  } catch (error) {
    console.error("Error deleting cant_have:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all must haves for the logged-in user
router.get("/must-haves", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, item FROM must_haves WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting must_haves:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new must have
router.post("/must-haves", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item } = req.body;

    if (!item || item.trim() === "") {
      return res.status(400).json({ message: "Item is required" });
    }

    const result = await pool.query(
      "INSERT INTO must_haves (user_id, item) VALUES ($1, $2) RETURNING id, item",
      [userId, item.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res
        .status(400)
        .json({ message: "This item is already in your must haves list" });
    }
    console.error("Error adding must_have:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a must have
router.delete("/must-haves/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    const result = await pool.query(
      "DELETE FROM must_haves WHERE id = $1 AND user_id = $2 RETURNING id",
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item removed successfully" });
  } catch (error) {
    console.error("Error deleting must_have:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
