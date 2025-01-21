const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch the user from the database, excluding the password
    const result = await pool.query(
      "SELECT id, email, name, ai_actions, password FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );
    // Send the response with token and user info, excluding the password
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        ai_actions: user.ai_actions,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if the email is already in use
    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: "User created successfully",
      userId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Error creating user" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    await pool.query(
      "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
      [token, expires, user.rows[0].id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const htmlContent = `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="background-color: #05472A; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
          MealPilot
        </div>
      </div>
      <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #05472A; margin-top: 0;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You are receiving this because you (or someone else) have requested to reset the password for your MealPilot account.</p>
        <p>Please click the button below to complete the process:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #FF9D72; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
        </div>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      </div>
      <div style="text-align: center; font-size: 12px; color: #666;">
        <p>&copy; 2025 VibeQuest. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;

    const msg = {
      to: user.rows[0].email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "MealPilot Password Reset Request",
      html: htmlContent,
      text: `Reset your MealPilot password by visiting: ${resetUrl}`,
    };

    await sgMail.send(msg);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Error processing your request" });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2",
      [token, new Date()]
    );

    if (user.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
      [hashedPassword, user.rows[0].id]
    );

    res.status(200).json({ message: "Password has been reset" });
  } catch (error) {
    console.error("Error in reset password:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
});

router.get("/check-email", async (req, res) => {
  const { email } = req.query;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    res.json({ available: result.rows.length === 0 });
  } catch (error) {
    console.error("Error checking email availability:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/check-email-exists", async (req, res) => {
  const { email } = req.query;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    res.json({ exists: result.rows.length > 0 });
  } catch (error) {
    console.error("Error checking email existence:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
