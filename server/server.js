const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sgMail = require("@sendgrid/mail");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
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
app.use("/api/users", userRoutes);
app.use("/api/recipe", recipeRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
