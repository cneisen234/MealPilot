const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const authMiddleware = require("../middleware/auth");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch the user from the database, excluding the password
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Define a function to check the user's subscription or trial status
    const checkUserSubscription = async (user) => {
      const now = new Date();
      let hasSubscription = false;
      let message = "No subscription or trial period";

      // Check if user is admin or has a valid subscription or trial
      if (user.admin) {
        hasSubscription = true;
        message = "Admin access granted";
      }

      // Check if user is in trial
      if (!hasSubscription && user.trial_start_date && user.trial_end_date) {
        const trialEnd = new Date(user.trial_end_date);
        if (now <= trialEnd) {
          hasSubscription = true;
          message = "Trial period active";
        }
      }

      // Check if user has an active subscription
      if (!hasSubscription && user.stripe_subscription_id) {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            user.stripe_subscription_id
          );
          if (
            subscription.status === "active" ||
            subscription.status === "trialing"
          ) {
            hasSubscription = true;
            message = "Subscription active";
          } else {
            // Subscription is inactive, update status
            await pool.query(
              "UPDATE users SET has_subscription = false WHERE id = $1",
              [user.id]
            );
            message = "Subscription inactive";
          }
        } catch (stripeError) {
          console.error("Error checking subscription status:", stripeError);
          message = "Subscription check failed";
        }
      }

      // If any of the conditions allow access, update has_subscription
      if (hasSubscription && user.has_subscription === false) {
        await pool.query(
          "UPDATE users SET has_subscription = true WHERE id = $1",
          [user.id]
        );
      }

      return { hasSubscription, message };
    };

    // Run the subscription check
    const { hasSubscription } = await checkUserSubscription(user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Send the response with token and user info, including subscription status
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.name,
        ai_actions: user.ai_actions,
        has_subscription: hasSubscription,
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
    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email.toLowerCase()]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Calculate trial end date (30 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    const result = await pool.query(
      `INSERT INTO users (
        name, 
        email, 
        password
      ) VALUES ($1, $2, $3) 
      RETURNING id, trial_end_date`,
      [name, email.toLowerCase(), hashedPassword]
    );

    // Create welcome email HTML content
    const welcomeHtmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #05472A; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
              MealSphere
            </div>
          </div>
          <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #05472A; margin-top: 0;">Welcome to MealSphere!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for joining MealSphere! We're excited to help you streamline your kitchen and discover amazing recipes tailored to your preferences.</p>
            
            <h3 style="color: #FF9D72;">Popular Features:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px; padding-left: 20px;">📸 Snap photos of your groceries to automatically add them to your inventory</li>
              <li style="margin-bottom: 10px; padding-left: 20px;">🧾 Scan receipts to update multiple items at once</li>
              <li style="margin-bottom: 10px; padding-left: 20px;">🤖 AI-powered recipe suggestions based on your dietary preferences</li>
              <li style="margin-bottom: 10px; padding-left: 20px;">📅 Automated meal planning with a push of a button</li>
            </ul>

            <p>As a reminder your free trial expires on ${trialEndDate.toLocaleDateString()}. Click the link below to subscribe.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/account-settings" 
                 style="background-color: #FF9D72; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Subscribe Now
              </a>
            </div>
            <p>We truly hope MealSphere becomes the holistic kitchen solution you've been needing. We're excited to help you save time, money, and stress with the power of AI.</p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #666;">
            <p>&copy; 2025 VibeQuest. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Create admin notification email HTML content
    const adminNotificationHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #05472A; margin-top: 0;">New User Signup</h2>
            <p>A new user has signed up for MealSphere:</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Signup Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Trial End Date:</strong> ${trialEndDate.toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    // Send welcome email to new user
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Welcome to MealSphere! 🎉",
      html: welcomeHtmlContent,
      text: `Welcome to MealSphere! Your trial expires on ${trialEndDate.toLocaleDateString()}. Visit ${
        process.env.FRONTEND_URL
      }/account-settings to subscribe.`,
    });

    // Send notification email to admin
    await sgMail.send({
      to: "christopherjay71186@gmail.com",
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "MealSphere: New User Signup",
      html: adminNotificationHtml,
      text: `New user signup - Name: ${name}, Email: ${email}, Trial End: ${trialEndDate.toLocaleString()}`,
    });

    res.status(201).json({
      message: "User created successfully",
      userId: result.rows[0].id,
      trialEndDate: result.rows[0].trial_end_date,
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
      email.toLowerCase(),
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
          MealSphere
        </div>
      </div>
      <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #05472A; margin-top: 0;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You are receiving this because you (or someone else) have requested to reset the password for your MealSphere account.</p>
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
      subject: "MealSphere Password Reset Request",
      html: htmlContent,
      text: `Reset your MealSphere password by visiting: ${resetUrl}`,
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
      email.toLowerCase(),
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
      email.toLowerCase(),
    ]);
    res.json({ exists: result.rows.length > 0 });
  } catch (error) {
    console.error("Error checking email existence:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
