const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const {
  cancelScheduledDowngrade,
  updateUserSubscription,
} = require("../utils/paymentUtils");

const {
  getUserById,
  updateUserTier,
  updateUserStripeCustomerId,
} = require("../utils/userUtils");
const {
  attachPaymentMethodToCustomer,
  cancelExistingSubscription,
  createNewSubscription,
  createNewSubscriptionWithTrial,
  calculateProratedAmount,
  // calculateTax,
} = require("../utils/paymentUtils");
const { scheduleDowngrade } = require("../utils/subscriptionUtils");
const {
  sendSubscriptionConfirmation,
  sendDowngradeConfirmation,
} = require("../utils/emailUtils");

const PaymentTier = {
  Owner: 1,
  Premium: 2,
  Basic: 3,
  Free: 4,
};

router.post("/:userId/upgrade", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { newTier, paymentMethodId, address } = req.body;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let stripeCustomer = user.stripe_customer_id
      ? await stripe.customers.retrieve(user.stripe_customer_id)
      : await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: user.id },
          address: address,
        });

    if (stripeCustomer.deleted) {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
    }

    await updateUserStripeCustomerId(user.id, stripeCustomer.id);
    if (paymentMethodId) {
      const currentDefaultPaymentMethod =
        stripeCustomer.invoice_settings.default_payment_method;

      if (currentDefaultPaymentMethod !== paymentMethodId) {
        // Attach the payment method to the customer
        await attachPaymentMethodToCustomer(stripeCustomer.id, paymentMethodId);
      }
      // If paymentMethodId is the same as the current default, we don't need to do anything
    } else if (!stripeCustomer.invoice_settings.default_payment_method) {
      return res.status(400).json({
        error: "No payment method provided and no default payment method set",
      });
    }

    const currentTier = PaymentTier[user.payment_tier];
    const newPriceId =
      newTier === PaymentTier.Basic
        ? process.env.STRIPE_BASIC_PRICE_ID
        : process.env.STRIPE_PREMIUM_PRICE_ID;

    let amount = 0;
    let proratedInfo = null;

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      status: "active",
      limit: 1,
    });
    if (subscriptions.data.length > 0) {
      const currentSubscription = subscriptions.data[0];
      const currentPeriodEnd = new Date(
        currentSubscription.current_period_end * 1000
      );
      const currentPeriodStart = new Date(
        currentSubscription.current_period_start * 1000
      );
      const now = new Date();
      const daysLeft = Math.ceil(
        (currentPeriodEnd - now) / (1000 * 60 * 60 * 24)
      );
      const totalDays = Math.ceil(
        (currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24)
      );

      if (
        currentTier === PaymentTier.Basic &&
        newTier === PaymentTier.Premium
      ) {
        proratedInfo = calculateProratedAmount(daysLeft, totalDays, 999, 1999);
        amount = Number(proratedInfo.proratedAmount);
        await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          customer: stripeCustomer.id,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: "Prorated charge for upgrade to Premium",
        });
      } else if (newTier === PaymentTier.Basic) {
        amount = 999;
      } else if (newTier === PaymentTier.Premium) {
        amount = 1999;
      }

      console.log("amount", amount);
      // Cancel existing subscription
      await cancelExistingSubscription(stripeCustomer.id);
    } else {
      if (newTier === PaymentTier.Basic) {
        amount = 999;
      } else if (newTier === PaymentTier.Premium) {
        amount = 1999;
      }
    }

    await cancelScheduledDowngrade(userId);

    // const { taxAmount, totalAmount } = await calculateTax(
    //   amount,
    //   stripeCustomer.id
    // );

    // Create new subscription
    const newSubscription =
      currentTier === PaymentTier.Basic && newTier === PaymentTier.Premium
        ? await createNewSubscriptionWithTrial(
            stripeCustomer.id,
            newPriceId
            // taxAmount
          )
        : // : await createNewSubscription(stripeCustomer.id, newPriceId, taxAmount);
          await createNewSubscription(stripeCustomer.id, newPriceId);
    amount = Number(amount);

    // Update user's subscription in the database
    await updateUserSubscription(user.id, newTier, newSubscription.id);

    // Send confirmation email
    const totalCharged = (amount / 100).toFixed(2);
    await sendSubscriptionConfirmation(
      user.email,
      totalCharged,
      new Date().toLocaleDateString(),
      new Date(newSubscription.current_period_end * 1000).toLocaleDateString()
    );

    res.json({
      success: true,
      message: "Upgrade successful",
      newTier: newTier,
      proratedInfo: proratedInfo,
      nextBillingDate: new Date(
        newSubscription.current_period_end * 1000
      ).toLocaleDateString(),
      // taxAmount: taxAmount,
      // totalAmount: totalAmount,
    });
  } catch (error) {
    console.error("Error processing upgrade:", error);
    res
      .status(500)
      .json({ error: error.message || "Error processing upgrade" });
  }
});

router.post("/:userId/confirm-upgrade", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { paymentIntentId, newTier } = req.body;

  try {
    // Verify the payment was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Update user in database
      await updateUserTier(userId, newTier);

      res.json({
        message: "Upgrade successful",
        user: await getUserById(userId),
      });
    } else {
      res.status(400).json({ error: "Payment was not successful" });
    }
  } catch (error) {
    console.error("Error confirming upgrade:", error);
    res.status(500).json({ error: "Error processing upgrade confirmation" });
  }
});

router.post("/:userId/downgrade", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { newTier } = req.body;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentTier = PaymentTier[user.payment_tier];

    if (currentTier === PaymentTier.Free || newTier <= currentTier) {
      return res.status(400).json({ error: "Invalid downgrade request" });
    }

    if (!user.stripe_subscription_id) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    await cancelScheduledDowngrade(userId);

    const currentSubscription = await stripe.subscriptions.retrieve(
      user.stripe_subscription_id
    );
    const currentPeriodEnd = new Date(
      currentSubscription.current_period_end * 1000
    );

    // Schedule the downgrade
    await scheduleDowngrade(
      userId,
      newTier,
      currentSubscription.current_period_end
    );

    if (newTier === 4) {
      // Schedule cancellation at period end
      await stripe.subscriptions.update(currentSubscription.id, {
        cancel_at_period_end: true,
      });
    } else {
      // Schedule downgrade to Basic at period end
      const newPriceId = process.env.STRIPE_BASIC_PRICE_ID;

      await stripe.subscriptions.update(currentSubscription.id, {
        proration_behavior: "none",
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        billing_cycle_anchor: "unchanged",
      });
    }

    res.json({
      success: true,
      message: "Downgrade scheduled",
      newTier: newTier,
      effectiveDate: currentPeriodEnd.toISOString(),
    });
    const formattedEffectiveDate = currentPeriodEnd.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    let newPlan = "Free";
    if (newTier === 3) {
      newPlan = "Basic";
    } else if (newTier === 2) {
      newPlan = "Premium";
    }

    await sendDowngradeConfirmation(
      user.email,
      user.payment_tier,
      newPlan,
      formattedEffectiveDate
    );
  } catch (error) {
    console.error("Error processing downgrade:", error);
    res
      .status(500)
      .json({ error: error.message || "Error processing downgrade" });
  }
});

router.post("/update-payment-method", authMiddleware, async (req, res) => {
  const { paymentMethodId, address } = req.body;
  const userId = req.user.id;

  try {
    const user = await getUserById(userId);

    // Check if user has a Stripe customer ID, if not, create one
    if (!user.stripe_customer_id) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        address: address,
      });
      user.stripe_customer_id = customer.id;
      await updateUserStripeCustomerId(userId, customer.id);
    }

    // Attach the new payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripe_customer_id,
    });

    // Set it as the default payment method
    await stripe.customers.update(user.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Update any active subscriptions to use the new payment method
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
    });
    for (const subscription of subscriptions.data) {
      await stripe.subscriptions.update(subscription.id, {
        default_payment_method: paymentMethodId,
      });
    }

    res.json({
      success: true,
      message: "Payment method updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment method:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/subscription-status", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId);

    // Fetch the scheduled downgrade
    const scheduledDowngradeQuery = await pool.query(
      "SELECT new_tier, downgrade_date FROM scheduled_downgrades WHERE user_id = $1",
      [userId]
    );

    const scheduledDowngrade = scheduledDowngradeQuery.rows[0];

    let status = {
      plan: user.payment_tier,
      status: "active", // Default status
      nextBillingDate: null,
      scheduledDowngrade: scheduledDowngrade
        ? {
            newPlan: scheduledDowngrade.new_tier,
            date: scheduledDowngrade.downgrade_date.toISOString(),
          }
        : null,
    };

    if (user.stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          user.stripe_subscription_id
        );
        status.status = stripeSubscription.status;
        status.nextBillingDate = new Date(
          stripeSubscription.current_period_end * 1000
        ).toISOString();
      } catch (stripeError) {
        console.error("Error fetching Stripe subscription:", stripeError);
        // If there's an error with Stripe, we'll keep the default values
      }
    } else if (user.payment_tier === "FREE") {
      // For free users without a stripe_subscription_id
      status.status = "free";
    }

    res.json(status);
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ message: "Error fetching subscription status" });
  }
});

router.post("/:userId/cancel-downgrade", authMiddleware, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Cancel the scheduled downgrade
    await cancelScheduledDowngrade(userId);

    if (user.stripe_subscription_id) {
      // Fetch the current Stripe subscription
      const subscription = await stripe.subscriptions.retrieve(
        user.stripe_subscription_id
      );

      // Determine the correct price ID based on the user's current tier
      let currentPriceId;
      switch (user.payment_tier) {
        case "Basic":
          currentPriceId = process.env.STRIPE_BASIC_PRICE_ID;
          break;
        case "Premium":
          currentPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
          break;
        default:
          throw new Error(`Invalid payment tier: ${user.payment_tier}`);
      }

      // Remove the cancel_at_period_end flag and revert to the current price
      await stripe.subscriptions.update(user.stripe_subscription_id, {
        cancel_at_period_end: false,
        proration_behavior: "none",
        items: [
          {
            id: subscription.items.data[0].id,
            price: currentPriceId,
          },
        ],
      });
    }

    res.json({
      success: true,
      message: "Scheduled downgrade cancelled",
      currentTier: user.payment_tier,
    });
  } catch (error) {
    console.error("Error cancelling downgrade:", error);
    res
      .status(500)
      .json({ error: error.message || "Error cancelling downgrade" });
  }
});

router.get("/check-primary-payment-method/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await getUserById(userId);

    if (!user || !user.stripe_customer_id) {
      return res.json({ hasPrimaryPaymentMethod: false });
    }

    const customer = await stripe.customers.retrieve(user.stripe_customer_id);
    const defaultPaymentMethodId =
      customer.invoice_settings.default_payment_method;

    if (defaultPaymentMethodId) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        defaultPaymentMethodId
      );

      res.json({
        hasPrimaryPaymentMethod: true,
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        address: customer.address,
        paymentMethodId: defaultPaymentMethodId,
      });
    } else {
      res.json({ hasPrimaryPaymentMethod: false });
    }
  } catch (error) {
    console.error("Error checking primary payment method:", error);
    res.status(500).json({ error: "Failed to check primary payment method" });
  }
});

module.exports = router;
