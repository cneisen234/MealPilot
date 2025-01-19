// sharedListRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

// Create shared list
router.post("/create/:shareid", async (req, res) => {
  try {
    const shareId = req.params.shareid;

    // Set expiration to exactly 24 hours from now
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24);

    await pool.query(
      `INSERT INTO shared_lists (share_id, items, expires_at) 
       VALUES ($1, $2, $3)`,
      [shareId, req.body.items, expirationTime]
    );

    // Set up a cleanup task to delete this specific list after 24 hours
    setTimeout(async () => {
      await pool.query("DELETE FROM shared_lists WHERE share_id = $1", [
        shareId,
      ]);
    }, 24 * 60 * 60 * 1000);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error creating shared list:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get shared list by ID
router.get("/get/:shareId", async (req, res) => {
  try {
    // First clean up any expired lists
    await pool.query("DELETE FROM shared_lists WHERE expires_at <= NOW()");

    // Then get the requested list if it exists
    const result = await pool.query(
      `SELECT items FROM shared_lists WHERE share_id = $1`,
      [req.params.shareId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "List not found or expired" });
    }

    res.json(result.rows[0].items);
  } catch (error) {
    console.error("Error fetching shared list:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
