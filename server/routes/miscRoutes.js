const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const sgMail = require("@sendgrid/mail");
const axios = require("axios");

router.post("/contact-us", async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    const htmlContent = `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="background-color: #966FD6; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
          VibeQuest
        </div>
      </div>
      <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #966FD6; margin-top: 0;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h3 style="color: #966FD6;">Message:</h3>
        <p>${message}</p>
      </div>
      <div style="text-align: center; font-size: 12px; color: #666;">
        <p>&copy; 2024 VibeQuest. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;

    const msg = {
      to: "christopherjay71186@gmail.com",
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `VibeQuest Contact: ${subject}`,
      html: htmlContent,
      text: `New contact from ${name} (${email}): ${message}`,
    };

    await sgMail.send(msg);
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending contact form:", error);
    res.status(500).json({ message: "Error sending message" });
  }
});

router.post("/geocode", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.OPENCAGE_API_KEY}`
    );
    const result = response.data.results[0].components;
    res.json({
      city: result.city || result.town || result.village || "Unknown",
      state: result.state || "Unknown",
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "Failed to get location details" });
  }
});

router.get("/remaining-prompts", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    const userResult = await pool.query(
      "SELECT payment_tier, daily_prompt_count, last_prompt_reset FROM users WHERE id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Calculate effective count
    let effectiveCount = user.daily_prompt_count;
    console.log(
      user.last_prompt_reset.toISOString().split("T")[0],
      currentDate
    );
    if (user.last_prompt_reset.toISOString().split("T")[0] !== currentDate) {
      effectiveCount = 0;
    }

    // Calculate limit based on payment tier
    let limit = Infinity;
    // let limit;
    // switch (user.payment_tier) {
    //   case "Free":
    //     limit = 6;
    //     break;
    //   case "Basic":
    //     limit = 15;
    //     break;
    //   case "Premium":
    //   case "Owner":
    //     limit = Infinity;
    //     break;
    //   default:
    //     limit = 6;
    // }

    const remaining =
      limit === Infinity ? "Unlimited" : Number(limit) - Number(effectiveCount);

    res.json({ remaining, limit, used: effectiveCount });
  } catch (error) {
    console.error("Error fetching remaining prompts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/update-prompt-count", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query(
      "UPDATE users SET daily_prompt_count = daily_prompt_count + 1 WHERE id = $1",
      [userId]
    );
    res.json({ message: "Prompt count updated successfully" });
  } catch (error) {
    console.error("Error updating prompt count:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
