const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Get user's payment and subscription status
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT stripe_customer_id, stripe_payment_method_id, 
       stripe_subscription_id, has_subscription 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    let paymentMethod = null;

    if (user.stripe_payment_method_id) {
      paymentMethod = await stripe.paymentMethods.retrieve(
        user.stripe_payment_method_id
      );
    }

    res.json({
      hasPaymentMethod: !!user.stripe_payment_method_id,
      hasSubscription: user.has_subscription,
      paymentMethod: paymentMethod
        ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year,
          }
        : null,
    });
  } catch (error) {
    console.error("Error getting payment status:", error);
    res.status(500).json({ message: "Error getting payment status" });
  }
});

// Update payment method
router.post("/update-payment-method", authMiddleware, async (req, res) => {
  const { paymentMethodId } = req.body;

  try {
    const userResult = await pool.query(
      "SELECT stripe_customer_id FROM users WHERE id = $1",
      [req.user.id]
    );

    let customerId = userResult.rows[0]?.stripe_customer_id;

    // If no customer ID exists, create a new customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        payment_method: paymentMethodId,
        email: req.user.email,
      });
      customerId = customer.id;

      await pool.query(
        "UPDATE users SET stripe_customer_id = $1 WHERE id = $2",
        [customerId, req.user.id]
      );
    } else {
      // Attach the payment method to the existing customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    }

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Update the payment method ID in database
    await pool.query(
      `UPDATE users 
       SET stripe_payment_method_id = $1 
       WHERE id = $2`,
      [paymentMethodId, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating payment method:", error);
    res.status(500).json({ message: "Error updating payment method" });
  }
});

router.post("/subscribe", authMiddleware, async (req, res) => {
  const { consent } = req.body;

  try {
    await pool.query("BEGIN");

    if (!consent) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        message: "You must agree to the subscription terms to continue",
      });
    }

    const userResult = await pool.query(
      `SELECT 
        stripe_customer_id, 
        stripe_payment_method_id,
        trial_start_date,
        trial_end_date,
        stripe_subscription_id,
        has_subscription
      FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];

    if (!user.stripe_customer_id) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        message: "Customer account not properly set up",
      });
    }

    if (!user.stripe_payment_method_id) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        message: "Please add a payment method before subscribing",
      });
    }

    if (user.stripe_subscription_id) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        message: "You already have an active subscription",
      });
    }

    const now = new Date();
    const trialEnd = user.trial_end_date ? new Date(user.trial_end_date) : null;
    let subscriptionParams = {
      customer: user.stripe_customer_id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    };

    // If trial is still active and valid, set subscription to start after trial
    if (trialEnd && trialEnd > now) {
      subscriptionParams.trial_end = Math.floor(trialEnd.getTime() / 1000);
    }

    // Create the subscription with or without trial period
    const subscription = await stripe.subscriptions.create(subscriptionParams);

    if (!subscription || !subscription.id) {
      await pool.query("ROLLBACK");
      return res.status(500).json({
        message: "Error creating subscription with payment provider",
      });
    }

    // Verify subscription status
    if (
      subscription.status === "incomplete" ||
      subscription.status === "incomplete_expired"
    ) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        message: "Payment setup incomplete",
      });
    }

    // Update user record
    await pool.query(
      `UPDATE users 
       SET stripe_subscription_id = $1,
           has_subscription = true,
           subscription_consent = true,
           subscription_updated_at = NOW()
       WHERE id = $2
       RETURNING id, has_subscription, subscription_updated_at`,
      [subscription.id, req.user.id]
    );

    await pool.query("COMMIT");

    res.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      trialEnd: trialEnd && trialEnd > now ? trialEnd : null,
      status: subscription.status,
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error creating subscription:", error);

    // More specific error messages based on the error type
    if (error.type === "StripeCardError") {
      return res.status(400).json({ message: error.message });
    } else if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({ message: "Invalid subscription request" });
    }

    res.status(500).json({ message: "Error creating subscription" });
  }
});

// Cancel subscription
router.post("/cancel-subscription", authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT stripe_subscription_id FROM users WHERE id = $1",
      [req.user.id]
    );

    const { stripe_subscription_id } = userResult.rows[0];

    if (!stripe_subscription_id) {
      return res.status(400).json({ message: "No active subscription found" });
    }

    // Cancel at period end
    await stripe.subscriptions.update(stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await pool.query(
      `UPDATE users 
       SET has_subscription = false,
           subscription_updated_at = NOW() 
       WHERE id = $1`,
      [req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Error cancelling subscription" });
  }
});

module.exports = router;
