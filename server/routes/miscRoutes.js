const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const sgMail = require("@sendgrid/mail");

router.post("/contact-us", authMiddleware, async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    const htmlContent = `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="background-color: #05472A; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
          MealSphere
        </div>
      </div>
      <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #05472A; margin-top: 0;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h3 style="color: #05472A;">Message:</h3>
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

module.exports = router;
