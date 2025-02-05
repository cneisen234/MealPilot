const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");

const MILESTONES = [1, 5, 10, 20, 50, 100, 500, 1250, 5000];

// Get user's achievements
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get or create user achievements
    let result = await pool.query(
      "SELECT * FROM achievements WHERE user_id = $1",
      [userId]
    );

    // If no achievements record exists, create one
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO achievements (user_id) 
         VALUES ($1) 
         RETURNING *`,
        [userId]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error getting achievements:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update achievement count and check for milestones
router.put("/increment", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;

    const validTypes = [
      "recipes_generated",
      "recipes_imported",
      "meal_plans_created",
      "items_photo_added",
      "items_voice_added",
      "receipt_updates",
      "lists_shared",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid achievement type" });
    }

    // Get current count before update
    const beforeCount = await pool.query(
      `SELECT ${type} FROM achievements WHERE user_id = $1`,
      [userId]
    );
    const oldCount = beforeCount.rows[0]?.[type] || 0;

    // Update the count
    const result = await pool.query(
      `INSERT INTO achievements (user_id, ${type}) 
       VALUES ($1, 1)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         ${type} = achievements.${type} + 1,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId]
    );

    const newCount = result.rows[0][type];

    // Check if any milestone was reached
    const milestone = MILESTONES.find((m) => oldCount < m && newCount >= m);

    // Format achievement type for display
    const formattedType = type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    res.json({
      ...result.rows[0],
      achievement: milestone
        ? {
            milestone,
            type: formattedType,
            isFirst: milestone === 1,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating achievement:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
