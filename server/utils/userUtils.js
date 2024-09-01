const pool = require("../db");

async function getUserById(userId) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0];
}

async function updateUserTier(userId, newTier) {
  console.log("newTier", newTier);
  await pool.query("UPDATE users SET payment_tier = $1 WHERE id = $2", [
    newTier,
    userId,
  ]);
}

async function getUserByStripeCustomerId(stripeCustomerId) {
  const result = await pool.query(
    "SELECT * FROM users WHERE stripe_customer_id = $1",
    [stripeCustomerId]
  );
  return result.rows[0];
}

async function updateUserStripeCustomerId(userId, stripeCustomerId) {
  try {
    await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [
      stripeCustomerId,
      userId,
    ]);
  } catch (error) {
    console.error("Error updating user's Stripe customer ID:", error);
    throw error;
  }
}

module.exports = {
  getUserById,
  updateUserTier,
  updateUserStripeCustomerId,
  getUserByStripeCustomerId,
};
