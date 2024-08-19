const pool = require("../db");

const createNotification = async (userId, content, type) => {
  try {
    const query =
      "INSERT INTO notifications (user_id, content, type) VALUES ($1, $2, $3) RETURNING *";
    const result = await pool.query(query, [userId, content, type]);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

module.exports = {
  createNotification,
};
