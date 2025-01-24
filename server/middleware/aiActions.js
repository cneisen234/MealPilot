// middleware/aiActions.js
const pool = require("../db");

const checkAiActions = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // Get current AI actions count and admin status
    const result = await pool.query(
      `SELECT ai_actions, 
              admin,
              CASE 
                WHEN DATE(last_action_reset) < CURRENT_DATE 
                THEN true 
                ELSE false 
              END as should_reset
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    const { ai_actions, should_reset, admin } = result.rows[0];

    // If user is admin, skip rate limiting
    if (admin) {
      next();
      return;
    }

    // Reset actions if it's a new day
    if (should_reset) {
      await pool.query(
        `UPDATE users 
         SET ai_actions = 40, 
             last_action_reset = CURRENT_DATE 
         WHERE id = $1 
         RETURNING ai_actions`,
        [req.user.id]
      );
      req.aiActions = 40;
    } else {
      req.aiActions = ai_actions;
    }

    // If no actions left, prevent the action
    if (req.aiActions <= 0) {
      //We want to stop the actions but not throw an error.
      return res.status(200).json({
        message:
          "You've reached your daily AI action limit. Try another method.",
        aiActions: 0,
      });
    }

    // Add warning flag if actions are low
    if (req.aiActions <= 10) {
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

    req.aiActions = updated.rows[0].ai_actions;

    // Add the remaining count to response headers
    res.set("X-AI-Actions-Remaining", req.aiActions.toString());

    next();
  } catch (error) {
    console.error("Error checking AI actions:", error);
    res.status(500).json({ message: "Error checking AI action limit" });
  }
};

module.exports = checkAiActions;
