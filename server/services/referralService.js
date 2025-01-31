// src/services/referralService.js
const pool = require("../db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

class ReferralService {
  static async checkAndApplyRewards(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get total successful referrals
      const referralCount = await client.query(
        `SELECT COUNT(*) 
      FROM referrals 
      WHERE referrer_code = (SELECT referral_code FROM users WHERE id = $1)
      AND status = 'successful'`,
        [userId]
      );

      const totalReferrals = parseInt(referralCount.rows[0].count);

      // Define reward tiers
      const rewardTiers = [
        { count: 25, type: "free_months", value: 12 }, // 12 free months
        { count: 10, type: "free_months", value: 3 }, // 3 free months
        { count: 5, type: "free_months", value: 1 }, // 1 free month
        { count: 3, type: "percentage_discount", value: 20 },
        { count: 1, type: "percentage_discount", value: 10 },
      ];

      // Find highest applicable tier
      const applicableTier = rewardTiers.find(
        (tier) => totalReferrals >= tier.count
      );

      if (applicableTier) {
        // Calculate expiration date based on reward type
        const expiresAt = new Date();
        let coupon = null;

        if (applicableTier.type === "free_months") {
          // Free months reward: Apply only for the next billing cycle
          expiresAt.setMonth(expiresAt.getMonth() + applicableTier.value);
        } else if (applicableTier.type === "percentage_discount") {
          coupon = await stripe.coupons.create({
            percent_off: applicableTier.value,
            duration: "once", // Apply once, not recurring
          });
        }

        // Update user's active discount
        const discountInfo = {
          type: applicableTier.type,
          value: applicableTier.value,
          expiresAt: expiresAt,
        };

        await client.query(
          `UPDATE users 
        SET active_referral_discount = $1::jsonb 
        WHERE id = $2`,
          [JSON.stringify(discountInfo), userId]
        );

        const userResult = await client.query(
          `SELECT stripe_subscription_id FROM users WHERE id = $1`,
          [userId]
        );

        const stripeSubscriptionId = userResult.rows[0]?.stripe_subscription_id;

        if (!stripeSubscriptionId) {
          throw new Error("Stripe subscription ID not found");
        }

        // Deactivate current rewards
        await client.query(
          `UPDATE referral_rewards 
         SET is_active = false 
         WHERE user_id = $1 AND is_active = true`,
          [userId]
        );

        // Add new reward
        await client.query(
          `INSERT INTO referral_rewards 
         (user_id, reward_tier, reward_type, reward_value, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            applicableTier.count,
            applicableTier.type,
            applicableTier.value,
            expiresAt,
          ]
        );

        // If it's a percentage discount, apply the coupon to the user's subscription
        if (coupon) {
          await stripe.subscriptions.update(stripeSubscriptionId, {
            coupon: coupon.id, // Apply coupon
            proration_behavior: "none", // Do not prorate
          });
        } else if (applicableTier.type === "free_months") {
          // Apply free months benefit to the user's next billing cycle (no permanent change to the subscription)
          // We just adjust the next billing period to apply the reward
          const currentSubscription = await stripe.subscriptions.retrieve(
            stripeSubscriptionId
          );

          // Calculate new billing cycle
          const currentEndDate = new Date(
            currentSubscription.current_period_end * 1000
          ); // Convert from Unix timestamp
          const newEndDate = new Date(
            currentEndDate.setMonth(
              currentEndDate.getMonth() + applicableTier.value
            )
          );

          // Set the new billing cycle anchor, but do not extend the subscription permanently
          await stripe.subscriptions.update(stripeSubscriptionId, {
            billing_cycle_anchor: Math.floor(newEndDate.getTime() / 1000), // Update to the new end date
            proration_behavior: "none", // Do not prorate
          });
        }
      }

      await client.query("COMMIT");
      return { success: true, appliedTier: applicableTier };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async handleNewSubscription(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if user was referred
      const referral = await client.query(
        `SELECT referrer_code 
      FROM referrals 
      WHERE referred_id = $1 
      AND status = 'pending'`,
        [userId]
      );

      if (referral.rows.length > 0) {
        const { referrer_code } = referral.rows[0];

        // Mark referral as successful
        await client.query(
          `UPDATE referrals 
        SET status = 'successful',
            paid_month_completed_at = NOW()
        WHERE referred_id = $1`,
          [userId]
        );

        // Get referrer's ID and check/apply their rewards
        const referrerResult = await client.query(
          `SELECT id FROM users WHERE referral_code = $1`,
          [referrer_code]
        );

        if (referrerResult.rows.length > 0) {
          await this.checkAndApplyRewards(referrerResult.rows[0].id);
        }

        await client.query("COMMIT");
        return { wasReferred: true, referrer_code };
      }

      await client.query("COMMIT");
      return { wasReferred: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  // Check and reset annual program if needed
  static async checkAndResetProgram(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        `SELECT 
          created_at, 
          referral_program_reset_date, 
          referral_program_reset_year
        FROM users 
        WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = userResult.rows[0];
      const currentYear = new Date().getFullYear();
      const anniversaryDate = new Date(user.created_at);
      const today = new Date();

      // Initialize reset date if not set
      if (!user.referral_program_reset_date) {
        anniversaryDate.setFullYear(currentYear);
        await client.query(
          `UPDATE users 
          SET referral_program_reset_date = $1,
              referral_program_reset_year = $2
          WHERE id = $3`,
          [anniversaryDate, currentYear, userId]
        );
        await client.query("COMMIT");
        return { wasReset: false, nextResetDate: anniversaryDate };
      }

      // Check if program needs reset
      if (
        user.referral_program_reset_year < currentYear &&
        today >= new Date(user.referral_program_reset_date)
      ) {
        anniversaryDate.setFullYear(currentYear);

        await client.query(
          `UPDATE users 
          SET referral_program_reset_date = $1,
              referral_program_reset_year = $2,
              active_referral_discount = NULL
          WHERE id = $3`,
          [anniversaryDate, currentYear, userId]
        );

        await client.query(
          `UPDATE referral_rewards 
          SET is_active = false 
          WHERE user_id = $1 AND is_active = true`,
          [userId]
        );

        await client.query("COMMIT");
        return { wasReset: true, nextResetDate: anniversaryDate };
      }

      await client.query("COMMIT");
      return {
        wasReset: false,
        nextResetDate: new Date(user.referral_program_reset_date),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Get referral statistics for a user
  static async getReferralStats(userId) {
    const client = await pool.connect();
    try {
      const stats = await client.query(
        `SELECT 
          u.referral_code,
          u.referral_program_reset_date,
          u.active_referral_discount,
          COUNT(r.*) as total_referrals
        FROM users u
        LEFT JOIN referrals r ON u.referral_code = r.referrer_code 
          AND r.status = 'successful'
        WHERE u.id = $1
        GROUP BY u.id, u.referral_code, u.referral_program_reset_date, u.active_referral_discount`,
        [userId]
      );

      if (stats.rows.length === 0) {
        throw new Error("User not found");
      }

      return stats.rows[0];
    } finally {
      client.release();
    }
  }

  // Mark referral as successful and apply rewards
  static async markReferralSuccessful(referrerCode, referredId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE referrals 
        SET status = 'successful',
            paid_month_completed_at = NOW()
        WHERE referrer_code = $1 AND referred_id = $2`,
        [referrerCode, referredId]
      );

      const referrer = await client.query(
        `SELECT id FROM users WHERE referral_code = $1`,
        [referrerCode]
      );

      if (referrer.rows.length > 0) {
        await this.checkAndApplyRewards(referrer.rows[0].id);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ReferralService;
