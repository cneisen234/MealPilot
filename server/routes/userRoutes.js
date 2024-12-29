const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");

router.post("/close-account", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // Start a transaction
    await pool.query("BEGIN");

    // Fetch user data
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    const user = userResult.rows[0];

    if (!user) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user from the database
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    // Commit the transaction
    await pool.query("COMMIT");

    res.json({ message: "Account closed successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error closing account:", error);
    res.status(500).json({ message: "Error closing account" });
  }
});

module.exports = router;
