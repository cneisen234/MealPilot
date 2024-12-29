const pool = require("../db");

async function getUserById(userId) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0];
}

module.exports = {
  getUserById,
};
