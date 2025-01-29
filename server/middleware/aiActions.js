// middleware/aiActions.js
const pool = require("../db");

// middleware/aiActions.js
const checkAiActions = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // Get current AI actions count and admin status
    const result = await pool.query(
      `SELECT ai_actions, admin FROM users WHERE id = $1`,
      [req.user.id]
    );

    const { ai_actions, admin } = result.rows[0];

    // If user is admin, skip rate limiting
    if (admin) {
      next();
      return;
    }

    // If no actions left, prevent the action
    if (ai_actions <= 0) {
      return res.status(200).json({
        message:
          "You've reached your daily AI action limit. Try another method.",
        aiActions: 0,
      });
    }

    // Add warning flag if actions are low
    if (ai_actions <= 10) {
      res.set("X-AI-Actions-Warning", "true");
    }

    // Decrement action count
    const updated = await pool.query(
      `UPDATE users 
       SET ai_actions = ai_actions - 1 
       WHERE id = $1 
       RETURNING ai_actions`,
      [req.user.id]
    );

    // Add the remaining count to response headers
    res.set("X-AI-Actions-Remaining", updated.rows[0].ai_actions.toString());

    next();
  } catch (error) {
    console.error("Error checking AI actions:", error);
    res.status(500).json({ message: "Error checking AI action limit" });
  }
};

module.exports = checkAiActions;
