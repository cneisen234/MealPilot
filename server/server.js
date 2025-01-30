const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sgMail = require("@sendgrid/mail");
const cron = require("node-cron");
const authRoutes = require("./routes/authRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes");
const inventoryRoutes = require("./routes/InventoryRoutes");
const shoppingListRoutes = require("./routes/shoppingListRoutes");
const sharedListRoutes = require("./routes/sharedListRoutes");
const preferenceRoutes = require("./routes/preferenceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;

// HTTPS redirect middleware
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    console.log("Redirecting to HTTPS");
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static(path.join(__dirname, "../build")));

// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/recipe", recipeRoutes);
app.use("/api/mealplan", mealPlanRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/shopping-list", shoppingListRoutes);
app.use("/api/shared-list", sharedListRoutes);
app.use("/api/preference", preferenceRoutes);
app.use("/api/payment", paymentRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

cron.schedule(
  "0 6 * * *",
  async () => {
    try {
      // Reset AI actions for all non-admin users to 40
      await pool.query(`
      UPDATE users 
      SET ai_actions = 60,
          last_action_reset = CURRENT_DATE 
      WHERE admin = false
    `);
      console.log(
        "Successfully reset AI actions for all users at CST midnight"
      );
    } catch (error) {
      console.error("Error resetting AI actions:", error);
    }
  },
  {
    timezone: "America/Chicago", // Explicitly set timezone to CST
  }
);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
