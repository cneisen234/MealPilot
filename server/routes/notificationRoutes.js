const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const query =
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC";
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const query =
      "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *";
    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
