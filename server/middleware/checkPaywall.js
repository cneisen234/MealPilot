const pool = require("../db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const checkPaywall = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // Get user data
    const result = await pool.query(
      `SELECT 
        admin,
        trial_start_date,
        trial_end_date,
        stripe_subscription_id,
        has_subscription
      FROM users 
      WHERE id = $1`,
      [req.user.id]
    );

    let isAdmin;
    let isInTrial;
    let isSubscribed;

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const now = new Date();

    // Check 1: Is user an admin?
    if (user.admin) {
      await pool.query(
        "UPDATE users SET has_subscription = true WHERE id = $1",
        [req.user.id]
      );
      isAdmin = true;
      return next();
    } else {
      isAdmin = false;
    }

    // Check 2: Is user in trial period?
    if (user.trial_start_date && user.trial_end_date) {
      const trialEnd = new Date(user.trial_end_date);
      if (now <= trialEnd) {
        await pool.query(
          "UPDATE users SET has_subscription = true WHERE id = $1",
          [req.user.id]
        );
        isInTrial = true;
        return next();
      } else {
        isInTrial = false;
      }
    }

    // Check 3: Does user have an active subscription?
    if (user.stripe_subscription_id)
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripe_subscription_id
        );

        if (
          subscription.status === "active" ||
          subscription.status === "trialing"
        ) {
          // Update subscription status if needed
          if (!user.has_subscription) {
            await pool.query(
              "UPDATE users SET has_subscription = true WHERE id = $1",
              [req.user.id]
            );
          }
          return next();
        } else {
          // Subscription is not active, update local status
          if (user.has_subscription) {
            await pool.query(
              "UPDATE users SET has_subscription = false WHERE id = $1",
              [req.user.id]
            );
          }
        }
      } catch (stripeError) {
        console.error("Stripe subscription check error:", stripeError);
        // Return paywall error if Stripe check fails and no subscription
        if (!user.has_subscription) {
          isSubscribed = false;
          return res.status(402).json({
            message: "Subscription required",
            code: "SUBSCRIPTION_REQUIRED",
          });
        } else {
          isSubscribed = true;
        }
      }

    if (!isAdmin && !isInTrial && !isSubscribed) {
      await pool.query(
        "UPDATE users SET has_subscription = false WHERE id = $1",
        [req.user.id]
      );
    }
  } catch (error) {
    console.error("Paywall check error:", error);
    return res
      .status(500)
      .json({ message: "Error checking subscription status" });
  }
};

module.exports = checkPaywall;
