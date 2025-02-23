const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
const authMiddleware = require("../middleware/auth");

// Affiliate Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    await pool.query("BEGIN");

    // Check if email exists
    const emailCheck = await pool.query(
      "SELECT * FROM affiliates WHERE LOWER(email) = LOWER($1)",
      [email.toLowerCase()]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Generate affiliate code
    const randomCode = crypto
      .randomBytes(8)
      .toString("hex")
      .slice(0, 8)
      .toUpperCase();
    const affiliateCode = `affiliate_${randomCode}`;

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new affiliate
    const result = await pool.query(
      `INSERT INTO affiliates (
        name, 
        email, 
        password,
        affiliate_code
      ) VALUES ($1, $2, $3, $4) 
      RETURNING id, affiliate_code`,
      [name, email.toLowerCase(), hashedPassword, affiliateCode]
    );

    // Send welcome email
    const welcomeHtmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #05472A; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
              MealSphere Affiliate Program
            </div>
          </div>
          <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #05472A; margin-top: 0;">Welcome to the MealSphere Affiliate Program!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for joining our affiliate program! Your unique affiliate sign up link is on your online dashboard:</p>

            <p>Make sure to use your unique link so you can be credited for the referral!</p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #666;">
            <p>&copy; 2025 VibeQuest. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Welcome to MealSphere Affiliate Program! 🎉",
      html: welcomeHtmlContent,
      text: `Welcome to the MealSphere Affiliate Program!`,
    });

    await pool.query("COMMIT");

    res.status(201).json({
      message: "Affiliate account created successfully",
      affiliateId: result.rows[0].id,
      affiliateCode: result.rows[0].affiliate_code,
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error during affiliate signup:", error);
    res.status(500).json({ message: "Error creating affiliate account" });
  }
});

// Affiliate Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch the affiliate from the database
    const result = await pool.query(
      "SELECT * FROM affiliates WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const affiliate = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, affiliate.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      {
        id: affiliate.id,
        email: affiliate.email,
        type: "affiliate", // Add this to distinguish from regular users
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Send response with token and affiliate info
    return res.json({
      message: "Login successful",
      token,
      affiliate: {
        id: affiliate.id,
        email: affiliate.email,
        name: affiliate.name,
        affiliate_code: affiliate.affiliate_code,
      },
    });
  } catch (error) {
    console.error("Error during affiliate login:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const affiliate = await pool.query(
      "SELECT * FROM affiliates WHERE email = $1",
      [email]
    );

    if (affiliate.rows.length === 0) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      "UPDATE affiliates SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
      [token, expires, affiliate.rows[0].id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/affiliate/reset-password/${token}`;

    const htmlContent = `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="background-color: #05472A; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
          MealSphere Affiliate Program
        </div>
      </div>
      <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #05472A; margin-top: 0;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You are receiving this because you (or someone else) have requested to reset the password for your MealSphere affiliate account.</p>
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

    await sgMail.send({
      to: affiliate.rows[0].email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "MealSphere Affiliate Password Reset",
      html: htmlContent,
      text: `Reset your affiliate password by visiting: ${resetUrl}`,
    });

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Error processing your request" });
  }
});

// Reset Password
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const affiliate = await pool.query(
      "SELECT * FROM affiliates WHERE reset_password_token = $1 AND reset_password_expires > $2",
      [token, new Date()]
    );

    if (affiliate.rows.length === 0) {
      return res.status(400).json({
        message: "Password reset token is invalid or has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE affiliates 
       SET password = $1, 
           reset_password_token = NULL, 
           reset_password_expires = NULL 
       WHERE id = $2`,
      [hashedPassword, affiliate.rows[0].id]
    );

    res.status(200).json({ message: "Password has been reset" });
  } catch (error) {
    console.error("Error in reset password:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
});

router.post("/referrals", authMiddleware, async (req, res) => {
  try {
    const { affiliateCode } = req.body;

    console.log(req.body);

    if (!affiliateCode) {
      return res
        .status(400)
        .json({ message: "No affiliate code found for this account." });
    }

    const referrals = await pool.query(
      `
      SELECT 
        name,
        email,
        stripe_payment_method_id IS NOT NULL AND subscription_consent = true as has_subscription,
        affiliate_paid,
        created_at
      FROM users 
      WHERE affiliate_code = $1
      ORDER BY created_at DESC
    `,
      [affiliateCode]
    );

    // Add some stats to the response
    const stats = {
      total_referrals: referrals.rows.length,
      subscribed_users: referrals.rows.filter((user) => user.has_subscription)
        .length,
      pending_payments: referrals.rows.filter(
        (user) => user.has_subscription && !user.affiliate_paid
      ).length,
    };

    res.json({
      stats,
      referrals: referrals.rows,
    });
  } catch (error) {
    console.error("Error fetching affiliate referrals:", error);
    res.status(500).json({ message: "Error fetching referrals" });
  }
});

router.post("/send-invoice", async (req, res) => {
  try {
    const { amount, userCount, affiliateCode } = req.body;

    const invoiceHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #05472A; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
              MealSphere Affiliate Invoice
            </div>
          </div>
          <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #05472A; margin-top: 0;">New Affiliate Payment Request</h2>
            <div style="margin: 20px 0; padding: 15px; background-color: white; border-radius: 5px;">
              <p><strong>Affiliate Code:</strong> ${affiliateCode}</p>
              <p><strong>Number of Unpaid Subscribed Users:</strong> ${userCount}</p>
              <p><strong>Amount Per User:</strong> $7.50</p>
              <p><strong>Total Amount Due:</strong> $${amount.toFixed(2)}</p>
              <p><strong>Request Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sgMail.send({
      to: "christopherjay71186@gmail.com",
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `MealSphere: New Affiliate Payment Request - ${affiliateCode}`,
      html: invoiceHtml,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending invoice:", error);
    res.status(500).json({ message: "Error sending invoice" });
  }
});

module.exports = router;
