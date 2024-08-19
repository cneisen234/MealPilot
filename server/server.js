const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("dotenv").config();
const sgMail = require("@sendgrid/mail");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { applyScheduledDowngrades } = require("./utils/subscriptionUtils");
const { sendSubscriptionConfirmation } = require("./utils/emailUtils");
const { getUserByStripeCustomerId } = require("./utils/userUtils");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const interestRoutes = require("./routes/interestRoutes");
const friendRoutes = require("./routes/friendRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const miscRoutes = require("./routes/miscRoutes");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", miscRoutes);

const startScheduledTask = () => {
  // Run the task immediately when the server starts
  applyScheduledDowngrades();

  // Then schedule it to run daily
  setInterval(applyScheduledDowngrades, 24 * 60 * 60 * 1000);
};

app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "invoice.payment_succeeded":
        const paymentSucceeded = event.data.object;
        await handleSuccessfulPayment(paymentSucceeded);
        const subscription = await stripe.subscriptions.retrieve(
          event.data.object.subscription
        );
        const user = await getUserByStripeCustomerId(subscription.customer);
        await sendSubscriptionConfirmation(
          user.email,
          event.data.object.amount_paid / 100,
          new Date(subscription.current_period_end * 1000)
        );
        break;
      case "invoice.payment_failed":
        const paymentFailed = event.data.object;
        await handleFailedPayment(paymentFailed);
        break;
      case "customer.subscription.updated":
        const subscriptionUpdated = event.data.object;
        await handleSubscriptionUpdate(subscriptionUpdated);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  // Start the scheduled task after the server has started
  startScheduledTask();
});
