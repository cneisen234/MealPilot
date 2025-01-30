const pool = require("./db");

async function resetAIActions() {
  try {
    // Reset AI actions for all non-admin users to 60
    await pool.query(`
      UPDATE users 
      SET ai_actions = 60,
          last_action_reset = NOW() 
      WHERE admin = false
    `);
    console.log("Successfully reset AI actions for all users at CST midnight");
  } catch (error) {
    console.error("Error resetting AI actions:", error);
  }
}

resetAIActions();
