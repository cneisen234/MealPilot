const pool = require("../db");
const { applyDowngrade } = require("./subscriptionUtils");

async function checkAndApplyDowngrade(userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check for scheduled downgrades
    const scheduledDowngradeQuery = await client.query(
      "SELECT * FROM scheduled_downgrades WHERE user_id = $1 AND downgrade_date <= CURRENT_DATE",
      [userId]
    );

    if (scheduledDowngradeQuery.rows.length > 0) {
      const downgrade = scheduledDowngradeQuery.rows[0];

      // Apply the downgrade
      await applyDowngrade(userId, downgrade.new_tier);

      // Delete the scheduled downgrade
      await client.query("DELETE FROM scheduled_downgrades WHERE id = $1", [
        downgrade.id,
      ]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in checkAndApplyDowngrade:", error);
  } finally {
    client.release();
  }
}

module.exports = { checkAndApplyDowngrade };
