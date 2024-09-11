const pool = require("../db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const {
  getUserById,
  updateUserTier,
  getUserByStripeCustomerId,
} = require("../utils/userUtils");
const { sendAdminNotification } = require("../utils/emailUtils");

const PaymentTier = {
  Owner: 1,
  Premium: 2,
  Basic: 3,
  Free: 4,
};

const applyDowngrade = async (userId, newTier) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const newTierEnum = Number(newTier) === 3 ? "Basic" : "Free";

    // Update user's tier in the database
    await updateUserTier(userId, newTierEnum);

    // Apply data deletions based on the new tier
    if (newTier === PaymentTier.Basic) {
      await client.query(
        `
        DELETE FROM friends
        WHERE user_id = $1 AND id NOT IN (
          SELECT id FROM friends
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 10
        )
      `,
        [userId]
      );

      await client.query(
        `
        DELETE FROM interests
        WHERE user_id = $1 AND id NOT IN (
          SELECT id FROM interests
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 10
        )
      `,
        [userId]
      );

      await client.query(
        `
        DELETE FROM items
        WHERE interest_id IN (
          SELECT id FROM interests
          WHERE user_id = $1
        ) AND id NOT IN (
          SELECT id FROM items
          WHERE interest_id IN (
            SELECT id FROM interests
            WHERE user_id = $1
          )
          ORDER BY created_at DESC
          LIMIT 20
        )
      `,
        [userId]
      );
    } else if (newTier === PaymentTier.Free) {
      await client.query("DELETE FROM friends WHERE user_id = $1", [userId]);

      await client.query(
        `
        DELETE FROM interests
        WHERE user_id = $1 AND id NOT IN (
          SELECT id FROM interests
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 3
        )
      `,
        [userId]
      );

      await client.query(
        `
        DELETE FROM items
        WHERE interest_id IN (
          SELECT id FROM interests
          WHERE user_id = $1
        ) AND id NOT IN (
          SELECT id FROM items
          WHERE interest_id IN (
            SELECT id FROM interests
            WHERE user_id = $1
          )
          ORDER BY created_at DESC
          LIMIT 5
        )
      `,
        [userId]
      );

      // Cancel the Stripe subscription for Free tier
      const user = await getUserById(userId);
      if (user.stripe_subscription_id) {
        await stripe.subscriptions.cancel(user.stripe_subscription_id);
        await client.query(
          "UPDATE users SET stripe_subscription_id = NULL WHERE id = $1",
          [userId]
        );
      }
    }

    // Remove the scheduled downgrade record
    await client.query("DELETE FROM scheduled_downgrades WHERE user_id = $1", [
      userId,
    ]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error applying downgrade:", error);
    throw error;
  } finally {
    client.release();
  }
};

const scheduleDowngrade = async (userId, newTier, downgradeDateEpoch) => {
  const result = await pool.query(
    "INSERT INTO scheduled_downgrades (user_id, new_tier, downgrade_date) VALUES ($1, $2, to_timestamp($3)) RETURNING *",
    [userId, newTier, downgradeDateEpoch]
  );
  return result.rows[0];
};

const fetchScheduledDowngrades = async () => {
  const result = await pool.query(
    "SELECT * FROM scheduled_downgrades WHERE downgrade_date <= NOW()"
  );
  return result.rows;
};

const applyScheduledDowngrades = async () => {
  const downgrades = await fetchScheduledDowngrades();
  for (const downgrade of downgrades) {
    try {
      await applyDowngrade(downgrade.user_id, downgrade.new_tier);
      console.log(
        `Applied downgrade for user ${downgrade.user_id} to tier ${downgrade.new_tier}`
      );
    } catch (error) {
      console.error(
        `Error applying downgrade for user ${downgrade.user_id}:`,
        error
      );
    }
  }
};

async function scheduleUserDowngrade(userId, newTier, downgradeDateEpoch) {
  await pool.query(
    "INSERT INTO scheduled_downgrades (user_id, new_tier, downgrade_date) VALUES ($1, $2, to_timestamp($3))",
    [userId, newTier, downgradeDateEpoch]
  );
}

async function handleSubscriptionUpdate(subscription) {
  console.log("Subscription updated:", subscription.id);

  try {
    const user = await getUserByStripeCustomerId(subscription.customer);
    if (!user) {
      throw new Error("User not found for Stripe customer");
    }

    // Update user's subscription details in your database
    // const status = subscription.status;
    // const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    // await updateUserSubscriptionStatus(user.id, status, currentPeriodEnd);

    // If the subscription was cancelled, schedule the downgrade
    if (subscription.cancel_at_period_end) {
      const cancelDate = new Date(subscription.cancel_at * 1000);
      await scheduleUserDowngrade(user.id, "Free", cancelDate);
    }

    console.log(`Subscription updated for user ${user.id}`);
  } catch (error) {
    console.error("Error handling subscription update:", error);
    await sendAdminNotification(
      "Error handling subscription update",
      `Subscription ${subscription.id}: ${error.message}`
    );
  }
}

module.exports = {
  // applyDowngrade,
  // scheduleDowngrade,
  // fetchScheduledDowngrades,
  // applyScheduledDowngrades,
  // handleSubscriptionUpdate,
};
