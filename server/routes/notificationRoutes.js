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

router.post("/", authMiddleware, async (req, res) => {
  const { content, type } = req.body;
  const userId = req.user.id; // Get the user ID from the authenticated user

  try {
    const query = `
      INSERT INTO notifications (user_id, content, type)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [userId, content, type];

    const result = await pool.query(query, values);
    const newNotification = result.rows[0];

    res.status(201).json(newNotification);
  } catch (error) {
    console.error("Error creating notification:", error);
    res
      .status(500)
      .json({ message: "Server error while creating notification" });
  }
});

router.put("/mark-all-read", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;

    await client.query("BEGIN");

    const updateQuery = `
      UPDATE notifications
      SET read = true
      WHERE user_id = $1 AND read = false
    `;

    const result = await client.query(updateQuery, [userId]);

    await client.query("COMMIT");

    res.json({
      message: "All notifications marked as read",
      updatedCount: result.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
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
