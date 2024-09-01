const pool = require("../db");

async function saveChatMessage(userId, message, sender) {
  const query = `
    INSERT INTO chat_history (user_id, message, sender)
    VALUES ($1, $2, $3)
    RETURNING id, message, sender, timestamp
  `;
  const result = await pool.query(query, [userId, message, sender]);
  return {
    id: result.rows[0].id,
    text: result.rows[0].message,
    sender: result.rows[0].sender,
    timestamp: result.rows[0].timestamp,
  };
}

async function getChatHistory(userId) {
  const query = `
    SELECT id, message, sender, timestamp
    FROM chat_history
    WHERE user_id = $1 AND timestamp >= CURRENT_DATE
    ORDER BY timestamp ASC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.map((row) => ({
    id: row.id,
    text: row.message,
    sender: row.sender,
    timestamp: row.timestamp,
  }));
}

module.exports = {
  saveChatMessage,
  getChatHistory,
};
