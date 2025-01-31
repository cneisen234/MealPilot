// src/routes/referralRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const ReferralService = require("../services/referralService");
const pool = require("../db");

// Get referral program stats
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    // Check and reset program if needed
    await ReferralService.checkAndResetProgram(req.user.id);

    // Get updated stats
    const stats = await ReferralService.getReferralStats(req.user.id);

    // Generate referral code if not exists
    if (!stats.referral_code) {
      const code = await ReferralService.generateReferralCode();
      await pool.query(
        `INSERT INTO referrals (referrer_id, referral_code, status)
                VALUES ($1, $2, 'pending')`,
        [req.user.id, code]
      );
      stats.referral_code = code;
    }

    res.json({
      totalReferrals: parseInt(stats.total_referrals) || 0,
      referralCode: stats.referral_code,
      resetDate: stats.referral_program_reset_date,
      activeDiscount: stats.active_referral_discount,
    });
  } catch (error) {
    console.error("Error getting referral stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Validate referral code during signup
router.post("/validate-code", async (req, res) => {
  try {
    const { code, email } = req.body;

    // Check if email has been referred before
    const previousReferral = await pool.query(
      `SELECT id FROM referrals 
            WHERE referred_email = $1`,
      [email]
    );

    if (previousReferral.rows.length > 0) {
      return res.status(400).json({
        message: "This email has already been referred",
      });
    }

    // Validate referral code
    const referral = await pool.query(
      `SELECT referrer_id 
            FROM referrals 
            WHERE referral_code = $1 
            AND status = 'pending'`,
      [code]
    );

    if (referral.rows.length === 0) {
      return res.status(404).json({
        message: "Invalid or expired referral code",
      });
    }

    // Update referral with referred email
    await pool.query(
      `UPDATE referrals 
            SET referred_email = $1 
            WHERE referral_code = $2`,
      [email, code]
    );

    res.json({
      valid: true,
      message: "Valid referral code",
    });
  } catch (error) {
    console.error("Error validating referral code:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Complete referral after first paid month
router.post("/complete", authMiddleware, async (req, res) => {
  try {
    const { referralCode } = req.body;

    // Verify referral exists and belongs to user
    const referral = await pool.query(
      `SELECT id, status 
            FROM referrals 
            WHERE referral_code = $1 
            AND referred_id = $2`,
      [referralCode, req.user.id]
    );

    if (referral.rows.length === 0) {
      return res.status(404).json({
        message: "Referral not found",
      });
    }

    if (referral.rows[0].status === "successful") {
      return res.status(400).json({
        message: "Referral already completed",
      });
    }

    // Mark referral as successful and apply rewards
    await ReferralService.markReferralSuccessful(referralCode);

    res.json({
      message: "Referral completed successfully",
    });
  } catch (error) {
    console.error("Error completing referral:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get list of successful referrals
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const referrals = await pool.query(
      `SELECT r.*, u.name as referred_name, u.email as referred_email
            FROM referrals r
            LEFT JOIN users u ON u.id = r.referred_id
            WHERE r.referrer_id = $1
            AND r.status = 'successful'
            ORDER BY r.paid_month_completed_at DESC`,
      [req.user.id]
    );

    res.json(referrals.rows);
  } catch (error) {
    console.error("Error fetching referrals:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
