const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const sgMail = require("@sendgrid/mail");

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
        has_subscription,
        name,
        email
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

    let existingSubscription = null;

    if (user.stripe_subscription_id) {
      try {
        existingSubscription = await stripe.subscriptions.retrieve(
          user.stripe_subscription_id
        );
      } catch (error) {
        console.error("Error retrieving subscription:", error);
        await pool.query("ROLLBACK");
        return res
          .status(500)
          .json({ message: "Error checking subscription status" });
      }

      // If the existing subscription is canceled, proceed with resubscription
      if (existingSubscription.status === "canceled") {
        console.log(
          "Existing subscription is canceled, allowing resubscription."
        );
      } else if (existingSubscription.status === "active") {
        await pool.query("ROLLBACK");
        return res.status(400).json({
          message: "You already have an active subscription",
        });
      }
    }

    // Set up subscription parameters
    const now = new Date();
    const trialEnd = user.trial_end_date ? new Date(user.trial_end_date) : null;
    let subscriptionParams = {
      customer: user.stripe_customer_id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    };

    if (trialEnd && trialEnd > now) {
      subscriptionParams.trial_end = Math.floor(trialEnd.getTime() / 1000);
    }

    // Create a new subscription
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

    // Subscription confirmation email
    const subscriptionHtmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #05472A; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
              MealSphere
            </div>
          </div>
          <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #05472A; margin-top: 0;">Thank You for Subscribing!</h2>
            <p>Hi ${user.name},</p>
            <p>Your subscription to MealSphere has been activated successfully.

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/recipe" 
                 style="background-color: #FF9D72; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Start Exploring Now
              </a>
            </div>
          
            <p>If you have any questions about your subscription, please don't hesitate to contact us! We're always here to help.</p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #666;">
            <p>&copy; 2025 VibeQuest. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Admin notification email
    const adminNotificationHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #05472A; margin-top: 0;">New Subscription</h2>
            <p>A user has subscribed to MealSphere:</p>
            <p><strong>Name:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Subscription Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Subscription ID:</strong> ${subscription.id}</p>
          </div>
        </body>
      </html>
    `;

    // Send confirmation email to subscriber
    await sgMail.send({
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "MealSphere subscription confirmation.",
      html: subscriptionHtmlContent,
      text: `Thank you for subscribing to MealSphere! Your subscription has been activated successfully.`,
    });

    // Send notification email to admin
    await sgMail.send({
      to: "christopherjay71186@gmail.com",
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "MealSphere: New Premium Subscription",
      html: adminNotificationHtml,
      text: `New subscription - Name: ${user.name}, Email: ${user.email}, Subscription ID: ${subscription.id}, Status: ${subscription.status}`,
    });

    // Update the user's subscription ID in the database with the new subscription
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
    res.status(500).json({ message: "Error creating subscription" });
  }
});

// Cancel subscription
router.post("/cancel-subscription", authMiddleware, async (req, res) => {
  try {
    await pool.query("BEGIN");

    // Get the user's subscription and personal info
    const userResult = await pool.query(
      `SELECT 
        stripe_subscription_id,
        name,
        email
      FROM users WHERE id = $1`,
      [req.user.id]
    );

    const user = userResult.rows[0];
    const { stripe_subscription_id } = user;

    // If no subscription ID exists, return an error
    if (!stripe_subscription_id) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ message: "No active subscription found" });
    }

    // Retrieve the subscription details from Stripe to check if it's active or canceled
    const subscription = await stripe.subscriptions.retrieve(
      stripe_subscription_id
    );

    // If the subscription is already canceled in Stripe
    if (subscription.status === "canceled") {
      // Update the database to reflect the canceled status
      await pool.query(
        `UPDATE users 
         SET has_subscription = false,
             stripe_subscription_id = NULL,
             subscription_updated_at = NOW() 
         WHERE id = $1`,
        [req.user.id]
      );

      await pool.query("ROLLBACK");
      return res.status(400).json({
        message: "Your subscription has already been canceled",
      });
    }

    // Get the end date of the current period for the email
    const periodEnd = new Date(subscription.current_period_end * 1000);
    const formattedEndDate = periodEnd.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // If the subscription is still active, cancel it at the end of the period
    await stripe.subscriptions.update(stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Cancellation confirmation email to user
    const userCancellationHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #05472A; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
              MealSphere
            </div>
          </div>
          <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #05472A; margin-top: 0;">Subscription Cancellation Confirmation</h2>
            <p>Hi ${user.name},</p>
            <p>We're sorry to see you go. This email confirms that your MealSphere subscription has been canceled.</p>
            <p>Your subscription will remain active until ${formattedEndDate}. You'll continue to have full access to all features until then.</p>
            <p>If you change your mind at any time, you can easily reactivate your subscription from your account settings.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/account-settings" 
                 style="background-color: #FF9D72; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Manage Subscription
              </a>
            </div>
            <p>We'd love to know what we could have done better. If you have a moment, please reply to this email with any feedback.</p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #666;">
            <p>&copy; 2025 VibeQuest. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Admin notification email
    const adminCancellationHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #05472A; margin-top: 0;">Subscription Cancellation Alert</h2>
            <p>A user has canceled their MealSphere subscription:</p>
            <p><strong>Name:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Subscription ID:</strong> ${stripe_subscription_id}</p>
            <p><strong>Cancellation Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Access Until:</strong> ${formattedEndDate}</p>
          </div>
        </body>
      </html>
    `;

    // Send confirmation email to user
    await sgMail.send({
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "MealSphere Subscription Cancellation Confirmation",
      html: userCancellationHtml,
      text: `Your MealSphere subscription has been canceled. You'll have access until ${formattedEndDate}.`,
    });

    // Send notification to admin
    await sgMail.send({
      to: "christopherjay71186@gmail.com",
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "MealSphere: Subscription Cancellation Alert",
      html: adminCancellationHtml,
      text: `Subscription canceled - Name: ${user.name}, Email: ${user.email}, Subscription ID: ${stripe_subscription_id}, Access until: ${formattedEndDate}`,
    });

    // Update the user's subscription status in the database
    await pool.query(
      `UPDATE users 
       SET has_subscription = false,
           stripe_subscription_id = NULL,
           subscription_updated_at = NOW() 
       WHERE id = $1`,
      [req.user.id]
    );

    await pool.query("COMMIT");
    res.json({ success: true, message: "Subscription canceled successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error canceling subscription:", error);
    res.status(500).json({ message: "Error canceling subscription" });
  }
});

// Define the /payment/subscription-info route
router.get("/subscription-info", authMiddleware, async (req, res) => {
  try {
    // Get user's subscription info from the database
    const userResult = await pool.query(
      `SELECT stripe_subscription_id 
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    // Check if subscription exists in the database
    const { stripe_subscription_id } = userResult.rows[0];
    if (!stripe_subscription_id) {
      return res.status(400).json({
        message: "No active subscription found",
      });
    }

    // Fetch subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      stripe_subscription_id
    );

    // Return relevant subscription info
    return res.json({
      status: subscription.status,
      current_period_end: subscription.current_period_end, // Unix timestamp
    });
  } catch (error) {
    return res.sendStatus(500);
  }
});

module.exports = router;
