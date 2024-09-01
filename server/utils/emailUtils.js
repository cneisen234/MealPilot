const sgMail = require("@sendgrid/mail");

async function sendSubscriptionConfirmation(
  email,
  amount,
  date,
  nextBillingDate
) {
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: "Subscription Payment Confirmation",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #966FD6;">VibeQuest Subscription Confirmation</h1>
            <p>Thank you for your continued subscription to VibeQuest!</p>
            <p>We've successfully processed your payment of $${amount} on ${date}.</p>
            <p>Your next billing date will be ${nextBillingDate}.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>The VibeQuest Team</p>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("Subscription confirmation email sent");
  } catch (error) {
    console.error("Error sending subscription confirmation email", error);
  }
}

async function sendDowngradeConfirmation(
  email,
  currentPlan,
  newPlan,
  effectiveDate
) {
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: "VibeQuest Subscription Downgrade Confirmation",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #966FD6;">VibeQuest Subscription Update</h1>
            <p>We've received your request to change your VibeQuest subscription plan.</p>
            <p>Your subscription will be downgraded from <strong>${currentPlan}</strong> to <strong>${newPlan}</strong>.</p>
            <p>This change will take effect on <strong>${effectiveDate}</strong>.</p>
            <p>Until then, you'll continue to enjoy all the benefits of your current plan.</p>
            <p>If you have any questions or wish to cancel this downgrade, please don't hesitate to contact us before the effective date.</p>
            <p>Thank you for being a valued member of the VibeQuest community!</p>
            <p>Best regards,<br>The VibeQuest Team</p>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("Downgrade confirmation email sent");
  } catch (error) {
    console.error("Error sending downgrade confirmation email", error);
  }
}

async function sendAdminNotification(subject, message) {
  const msg = {
    to: "christopherjay71186@gmail.com",
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: `VibeQuest Admin Alert: ${subject}`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF6347;">VibeQuest Admin Alert</h1>
            <h2>${subject}</h2>
            <p>${message}</p>
            <p>Please investigate and take appropriate action.</p>
            <p>This is an automated message from the VibeQuest system.</p>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("Admin notification sent");
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
}

module.exports = {
  sendSubscriptionConfirmation,
  sendDowngradeConfirmation,
  sendAdminNotification,
};
