const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sgMail = require("@sendgrid/mail");

const { applyScheduledDowngrades } = require("./utils/subscriptionUtils");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const interestRoutes = require("./routes/interestRoutes");
const friendRoutes = require("./routes/friendRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const miscRoutes = require("./routes/miscRoutes");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static(path.join(__dirname, "../build")));

if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../build/index.html"));
  });
}

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

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  // Start the scheduled task after the server has started
  startScheduledTask();
});
