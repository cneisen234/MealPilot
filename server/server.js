const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middleware/auth");
require("dotenv").config();
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
const openai = require("./openai");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function getUserById(userId) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0];
}

async function updateUserTier(userId, newTier) {
  await pool.query("UPDATE users SET payment_tier = $1 WHERE id = $2", [
    newTier,
    userId,
  ]);
}

// Function to apply all scheduled downgrades
const applyScheduledDowngrades = async () => {
  const downgrades = await fetchScheduledDowngrades();
  for (const downgrade of downgrades) {
    try {
      await applyDowngrade(downgrade.user_id, downgrade.new_tier);
      console.log(
        `Applied downgrade for user ${downgrade.user_id} to tier ${downgrade.new_tier}`
      );
    } catch (error) {
      console.error(
        `Error applying downgrade for user ${downgrade.user_id}:`,
        error
      );
    }
  }
};

const startScheduledTask = () => {
  // Run the task immediately when the server starts
  applyScheduledDowngrades();

  // Then schedule it to run daily
  setInterval(applyScheduledDowngrades, 24 * 60 * 60 * 1000);
};

async function scheduleUserDowngrade(userId, newTier, downgradeDateEpoch) {
  await pool.query(
    "INSERT INTO scheduled_downgrades (user_id, new_tier, downgrade_date) VALUES ($1, $2, to_timestamp($3))",
    [userId, newTier, downgradeDateEpoch]
  );
}

async function updateUserStripeCustomerId(userId, stripeCustomerId) {
  await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [
    stripeCustomerId,
    userId,
  ]);
}

async function getScheduledDowngrades() {
  const result = await pool.query(
    "SELECT * FROM scheduled_downgrades WHERE downgrade_date <= NOW()"
  );
  return result.rows;
}

const applyDowngrade = async (userId, newTier) => {
  await pool.query("BEGIN");
  try {
    // Update user's tier in the database
    await updateUserTier(userId, newTier);

    // If downgrading to Free tier, cancel the Stripe subscription
    if (newTier === "FREE") {
      const user = await getUserById(userId);
      if (user.stripe_subscription_id) {
        await stripe.subscriptions.del(user.stripe_subscription_id);
        await pool.query(
          "UPDATE users SET stripe_subscription_id = NULL WHERE id = $1",
          [userId]
        );
      }
    }

    // Remove the scheduled downgrade record
    await pool.query("DELETE FROM scheduled_downgrades WHERE user_id = $1", [
      userId,
    ]);

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
};

async function sendSubscriptionConfirmation(email, amount, date) {
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

// Request password reset
app.post("/api/auth/forgot-password", async (req, res) => {
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
        <div style="background-color: #966FD6; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; display: inline-block; border-radius: 5px;">
          VibeQuest
        </div>
      </div>
      <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #966FD6; margin-top: 0;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You are receiving this because you (or someone else) have requested to reset the password for your VibeQuest account.</p>
        <p>Please click the button below to complete the process:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #966FD6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
        </div>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      </div>
      <div style="text-align: center; font-size: 12px; color: #666;">
        <p>&copy; 2024 VibeQuest. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;

    const msg = {
      to: user.rows[0].email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "VibeQuest Password Reset Request",
      html: htmlContent,
      text: `Reset your VibeQuest password by visiting: ${resetUrl}`,
    };

    await sgMail.send(msg);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Error processing your request" });
  }
});

// Reset password
app.post("/api/auth/reset-password/:token", async (req, res) => {
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

app.post("/api/contact-us", async (req, res) => {
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
      to: "chris@integritytechsoftware.com",
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

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch the user from the database, excluding the password
    const result = await pool.query(
      "SELECT id, email, name, password FROM users WHERE email = $1",
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
      { expiresIn: "1h" }
    );
    // Send the response with token and user info, excluding the password
    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, username, email, password } = req.body;

  try {
    // Check if the email is already in use
    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Check if the username is already taken
    const usernameCheck = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    const result = await pool.query(
      "INSERT INTO users (name, username, email, password) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, username, email, hashedPassword]
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

app.post("/api/close-account", authMiddleware, async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;

  try {
    // Verify password
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValid = await bcrypt.compare(password, user.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Begin transaction
    await pool.query("BEGIN");

    // Delete user's data (adjust these queries based on your database schema)
    await pool.query(
      "DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1",
      [userId]
    );
    await pool.query(
      "DELETE FROM friends WHERE user_id = $1 OR friend_id = $1",
      [userId]
    );
    await pool.query(
      "DELETE FROM items WHERE interest_id IN (SELECT id FROM interests WHERE user_id = $1)",
      [userId]
    );
    await pool.query("DELETE FROM interests WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    // Commit transaction
    await pool.query("COMMIT");

    res.json({ message: "Account closed successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error closing account:", error);
    res.status(500).json({ message: "Error closing account" });
  }
});

app.get("/api/auth/check-email", async (req, res) => {
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

app.get("/api/auth/check-username", async (req, res) => {
  const { username } = req.query;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    res.json({ available: result.rows.length === 0 });
  } catch (error) {
    console.error("Error checking username availability:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/auth/check-email-exists", async (req, res) => {
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

const PaymentTier = {
  Owner: 1,
  Premium: 2,
  Basic: 3,
  Free: 4,
};

const checkPaymentTier = async (userId, requiredTier) => {
  const result = await pool.query(
    "SELECT payment_tier FROM users WHERE id = $1",
    [userId]
  );
  if (result.rows.length === 0) {
    throw new Error("User not found");
  }
  return PaymentTier[result.rows[0].payment_tier] <= requiredTier;
};

const checkPromptLimit = async (req, res, next) => {
  const userId = req.user.id;
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    // Get user's current count and last reset date
    const userResult = await pool.query(
      "SELECT payment_tier, daily_prompt_count, last_prompt_reset FROM users WHERE id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Reset count if it's a new day (but don't update the database)
    let effectiveCount = user.daily_prompt_count;
    if (user.last_prompt_reset.toISOString().split("T")[0] !== currentDate) {
      effectiveCount = 0;
    }

    // Check limits based on payment tier
    let limit;
    switch (user.payment_tier) {
      case "Free":
        limit = 6;
        break;
      case "Basic":
        limit = 15;
        break;
      case "Premium":
      case "Owner":
        limit = Infinity;
        break;
      default:
        limit = 6;
    }

    if (effectiveCount >= limit && limit !== Infinity) {
      return res.status(403).json({ message: "Daily prompt limit reached" });
    }

    next();
  } catch (error) {
    console.error("Error checking prompt limit:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update prompt count
app.get("/api/remaining-prompts", authMiddleware, async (req, res) => {
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
    if (user.last_prompt_reset.toISOString().split("T")[0] !== currentDate) {
      effectiveCount = 0;
    }

    // Calculate limit based on payment tier
    let limit;
    switch (user.payment_tier) {
      case "Free":
        limit = 6;
        break;
      case "Basic":
        limit = 15;
        break;
      case "Premium":
      case "Owner":
        limit = Infinity;
        break;
      default:
        limit = 6;
    }

    const remaining =
      limit === Infinity ? "Unlimited" : Number(limit) - Number(effectiveCount);

    res.json({ remaining, limit, used: effectiveCount });
  } catch (error) {
    console.error("Error fetching remaining prompts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/update-prompt-count", authMiddleware, async (req, res) => {
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

// Get logged-in user profile
app.get(
  "/api/users/profile",
  authMiddleware,
  checkPromptLimit,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userResult = await pool.query(
        "SELECT id, name, username, email, avatar, bio, bio_visibility, interests_visibility, city, state, payment_tier FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = userResult.rows[0];

      // Fetch interests based on payment tier
      let interestsResult;
      if (PaymentTier[user.payment_tier] <= PaymentTier.Basic) {
        interestsResult = await pool.query(
          `
        SELECT i.id, i.category, i.visibility, 
               json_agg(json_build_object('id', it.id, 'name', it.name, 'rating', it.rating)) AS items
        FROM interests i
        LEFT JOIN items it ON i.id = it.interest_id
        WHERE i.user_id = $1
        GROUP BY i.id
      `,
          [userId]
        );
        user.interests = interestsResult.rows;
      } else {
        // For Free tier, limit to 3 categories and 5 items per category
        interestsResult = await pool.query(
          `
        SELECT i.id, i.category, i.visibility, 
               (SELECT json_agg(json_build_object('id', it.id, 'name', it.name, 'rating', it.rating))
                FROM (SELECT * FROM items WHERE interest_id = i.id LIMIT 5) it) AS items
        FROM interests i
        WHERE i.user_id = $1
        LIMIT 3
      `,
          [userId]
        );
        user.interests = interestsResult.rows;
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.put("/api/users/:userId/profile", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, username, bio, city, state, bio_visibility } = req.body;

    // Ensure the logged-in user can only edit their own profile
    if (parseInt(userId) !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this profile" });
    }

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, username = $2, bio = $3, city = $4, state = $5, bio_visibility = $6
       WHERE id = $7
       RETURNING *`,
      [name, username, bio, city, state, bio_visibility, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = result.rows[0];
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.put(
  "/api/users/:userId/profile-picture",
  authMiddleware,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { avatar } = req.body;

      // Ensure the logged-in user can only edit their own profile
      if (parseInt(userId) !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to edit this profile" });
      }

      const result = await pool.query(
        `UPDATE users 
       SET avatar = $1
       WHERE id = $2
       RETURNING *`,
        [avatar, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = result.rows[0];
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile picture:", error);
      res.status(500).json({ message: "Server error", details: error.message });
    }
  }
);

app.post("/api/interests", authMiddleware, async (req, res) => {
  try {
    const { category, visibility } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      "INSERT INTO interests (user_id, category, visibility) VALUES ($1, $2, $3) RETURNING id, user_id, category, visibility",
      [userId, category, visibility]
    );

    const newInterest = result.rows[0];

    // Return the new interest with an empty items array
    const interest = {
      ...newInterest,
      items: [], // Empty array instead of array with null item
    };

    res.status(201).json(interest);
  } catch (error) {
    console.error("Error adding interest category:", error);
    res
      .status(500)
      .json({ message: "Server error while adding interest category" });
  }
});

app.delete("/api/interests/:categoryId", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { categoryId } = req.params;
    const userId = req.user.id;

    await client.query("BEGIN");

    // Check if the category belongs to the user
    const categoryCheck = await client.query(
      "SELECT * FROM interests WHERE id = $1 AND user_id = $2",
      [categoryId, userId]
    );

    if (categoryCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the category (items will be cascade deleted due to foreign key constraint)
    await client.query("DELETE FROM interests WHERE id = $1", [categoryId]);

    await client.query("COMMIT");

    res.status(204).send();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Server error while deleting category" });
  } finally {
    client.release();
  }
});

app.delete(
  "/api/interests/:categoryId/items/:itemId",
  authMiddleware,
  async (req, res) => {
    try {
      const { categoryId, itemId } = req.params;
      const userId = req.user.id;

      // Ensure the category belongs to the user
      const categoryCheck = await pool.query(
        "SELECT * FROM interests WHERE id = $1 AND user_id = $2",
        [categoryId, userId]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Delete the item
      await pool.query("DELETE FROM items WHERE id = $1 AND interest_id = $2", [
        itemId,
        categoryId,
      ]);

      res.status(204).send();
    } catch (error) {
      console.error("Error removing item:", error);
      res.status(500).json({ message: "Server error while removing item" });
    }
  }
);

app.get("/users", authMiddleware, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/users/not-friends", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT id, name, username, email, avatar
      FROM users
      WHERE id != $1
      AND id NOT IN (
        SELECT friend_id
        FROM friends
        WHERE user_id = $1
      )
    `;

    const result = await pool.query(query, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching non-friend users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, username, email, avatar FROM users"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user by id
app.get("/api/users/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT id, name, username, email, avatar FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get interests for a user
app.get("/api/users/:id/interests", authMiddleware, (req, res) => {
  const userInterests = interests.filter(
    (i) => i.userId === parseInt(req.params.id)
  );
  res.json(userInterests);
});

app.get("/api/friends", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has access to friends list
    const hasAccess = await checkPaymentTier(userId, PaymentTier.Basic);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "Upgrade required to access friends list" });
    }

    const query = `
      SELECT u.id, u.name, u.username, u.avatar
      FROM users u
      INNER JOIN friends f ON u.id = f.friend_id
      WHERE f.user_id = $1
    `;

    const result = await pool.query(query, [userId]);

    // For Basic tier, limit to 10 friends
    const friends = result.rows.slice(
      0,
      PaymentTier[req.user.payment_tier] === PaymentTier.Basic ? 10 : undefined
    );

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/friends/:friendId/profile", authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    // Check if the users are friends
    const friendshipCheck = await pool.query(
      "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
      [userId, friendId]
    );

    if (friendshipCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view this profile" });
    }

    // Fetch friend's profile data
    const friendQuery = await pool.query(
      `SELECT id, name, username, avatar, bio, bio_visibility, interests_visibility
       FROM users WHERE id = $1`,
      [friendId]
    );

    if (friendQuery.rows.length === 0) {
      return res.status(404).json({ message: "Friend not found" });
    }

    const friend = friendQuery.rows[0];

    // Respect privacy settings
    const profile = {
      id: friend.id,
      name: friend.name,
      username: friend.username,
      avatar: friend.avatar,
      bio: friend.bio_visibility === "public" ? friend.bio : null,
      interests: [],
    };

    // Fetch interests if allowed
    if (friend.interests_visibility === "public") {
      const interestsQuery = await pool.query(
        `SELECT i.category, json_agg(json_build_object('name', it.name, 'rating', it.rating)) as items
         FROM interests i
         LEFT JOIN items it ON i.id = it.interest_id
         WHERE i.user_id = $1
         GROUP BY i.id`,
        [friendId]
      );
      profile.interests = interestsQuery.rows;
    }

    res.json(profile);
  } catch (error) {
    console.error("Error fetching friend profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update the POST /api/friend-requests endpoint in server.js

app.post("/api/friend-requests", authMiddleware, async (req, res) => {
  try {
    const senderId = req.user.id; // ID of the user sending the request
    const { receiverId } = req.body; // ID of the user receiving the request

    // Check if a friend request already exists
    const checkQuery =
      "SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2";
    const checkResult = await pool.query(checkQuery, [senderId, receiverId]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Get sender's full name
    const senderQuery = "SELECT name FROM users WHERE id = $1";
    const senderResult = await pool.query(senderQuery, [senderId]);
    const senderName = senderResult.rows[0].name;

    // Insert new friend request
    const insertQuery =
      "INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') RETURNING *";
    const insertResult = await pool.query(insertQuery, [senderId, receiverId]);

    // Create a notification for the receiver
    await createNotification(
      receiverId, // Correctly using receiverId here
      `You have a new friend request from ${senderName}`,
      "friend_request"
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update the createNotification function if it's separate
const createNotification = async (userId, content, type) => {
  try {
    const query =
      "INSERT INTO notifications (user_id, content, type) VALUES ($1, $2, $3) RETURNING *";
    const result = await pool.query(query, [userId, content, type]);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Get friend requests for a user
app.get("/api/friend-requests", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT fr.id, fr.sender_id, fr.status, u.name, u.username, u.avatar
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/friend-requests/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'
    const userId = req.user.id;

    // Update friend request status
    const updateQuery =
      "UPDATE friend_requests SET status = $1 WHERE id = $2 AND receiver_id = $3 RETURNING *";
    const result = await pool.query(updateQuery, [status, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    const friendRequest = result.rows[0];

    // If accepted, add to friends list
    if (status === "accepted") {
      const addFriendQuery =
        "INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)";
      await pool.query(addFriendQuery, [userId, friendRequest.sender_id]);

      // Get names for both users
      const namesQuery = "SELECT id, name FROM users WHERE id = $1 OR id = $2";
      const namesResult = await pool.query(namesQuery, [
        userId,
        friendRequest.sender_id,
      ]);
      const names = namesResult.rows.reduce(
        (acc, user) => ({ ...acc, [user.id]: user.name }),
        {}
      );

      // Create notifications for both users
      await createNotification(
        userId,
        `You are now friends with ${names[friendRequest.sender_id]}`,
        "friend_accepted"
      );
      await createNotification(
        friendRequest.sender_id,
        `${names[userId]} has accepted your friend request`,
        "friend_accepted"
      );
    }

    res.json({ message: `Friend request ${status}` });
  } catch (error) {
    console.error("Error updating friend request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId);
    const query =
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC";
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/notifications/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const query =
      "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *";
    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new interest
app.post("/api/interests", authMiddleware, (req, res) => {
  const { userId, category, item, rating } = req.body;
  const newInterest = {
    id: interests.length + 1,
    userId: parseInt(userId),
    category,
    item,
    rating: parseInt(rating),
  };
  interests.push(newInterest);
  res.status(201).json(newInterest);
});

app.post(
  "/api/interests/:categoryId/items",
  authMiddleware,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { categoryId } = req.params;
      const { name, rating } = req.body;
      const userId = req.user.id;

      await client.query("BEGIN");

      // Check if the category belongs to the user
      const categoryCheck = await client.query(
        "SELECT * FROM interests WHERE id = $1 AND user_id = $2",
        [categoryId, userId]
      );

      if (categoryCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Validate input
      if (!name || name.trim() === "") {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Item name is required" });
      }

      if (!rating || rating < 1 || rating > 10) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Rating must be between 1 and 10" });
      }

      // Insert the new item
      const result = await client.query(
        "INSERT INTO items (interest_id, name, rating) VALUES ($1, $2, $3) RETURNING id, name, rating",
        [categoryId, name.trim(), rating]
      );

      const newItem = result.rows[0];

      await client.query("COMMIT");

      res.status(201).json(newItem);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error adding item:", error);
      res.status(500).json({ message: "Server error while adding item" });
    } finally {
      client.release();
    }
  }
);

app.put(
  "/api/interests/:categoryId/items/:itemId",
  authMiddleware,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { categoryId, itemId } = req.params;
      const { rating } = req.body;
      const userId = req.user.id;

      await client.query("BEGIN");

      // Check if the category belongs to the user
      const categoryCheck = await client.query(
        "SELECT * FROM interests WHERE id = $1 AND user_id = $2",
        [categoryId, userId]
      );

      if (categoryCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Validate input
      if (rating === undefined || rating < 1 || rating > 10) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Rating must be between 1 and 10" });
      }

      // Update the item rating
      const result = await client.query(
        "UPDATE items SET rating = $1 WHERE id = $2 AND interest_id = $3 RETURNING id, name, rating",
        [rating, itemId, categoryId]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Item not found" });
      }

      const updatedItem = result.rows[0];

      await client.query("COMMIT");

      res.json(updatedItem);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating item rating:", error);
      res
        .status(500)
        .json({ message: "Server error while updating item rating" });
    } finally {
      client.release();
    }
  }
);

app.get("/api/recommendations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has access to recommendations
    const hasAccess = await checkPaymentTier(userId, PaymentTier.Premium);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "Upgrade to Premium to access recommendations" });
    }

    // Implement your recommendation logic here
    // For now, we'll return dummy data
    const recommendations = [
      {
        id: 1,
        category: "Books",
        item: "The Hitchhiker's Guide to the Galaxy",
        description:
          "A sci-fi comedy classic that matches your interest in humorous literature and space exploration.",
        rating: 4.5,
      },
    ];

    res.json(recommendations);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/get-recommendation", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, friendIds } = req.body;

    // Fetch user data
    const userQuery = await pool.query(
      "SELECT bio, city, state FROM users WHERE id = $1",
      [userId]
    );
    const user = userQuery.rows[0];

    // Fetch user interests
    const userInterestsQuery = await pool.query(
      "SELECT category, array_agg(items.name) as items FROM interests JOIN items ON interests.id = items.interest_id WHERE user_id = $1 GROUP BY category",
      [userId]
    );
    const userInterests = userInterestsQuery.rows;

    let friendsData = [];
    if (friendIds && friendIds.length > 0) {
      // Check payment tier only if friends are included
      const hasAccess = await checkPaymentTier(userId, PaymentTier.Basic);
      if (!hasAccess) {
        return res.status(403).json({
          message:
            "Including friends in recommendations is not available on your current plan.",
        });
      }

      // Fetch friends' data
      const friendsQuery = await pool.query(
        "SELECT id, bio, city, state FROM users WHERE id = ANY($1)",
        [friendIds]
      );
      friendsData = friendsQuery.rows;

      // Fetch friends' interests
      for (let friend of friendsData) {
        const friendInterestsQuery = await pool.query(
          "SELECT category, array_agg(items.name) as items FROM interests JOIN items ON interests.id = items.interest_id WHERE user_id = $1 GROUP BY category",
          [friend.id]
        );
        friend.interests = friendInterestsQuery.rows;
      }
    }
    // Prepare the prompt for OpenAI
    let prompt = `Based on the following user information, provide a personalized recommendation:

    User:
    Bio: ${user.bio}
    Location: ${user.city}, ${user.state}
    Interests: ${userInterests
      .map((i) => `${i.category}: ${i.items.join(", ")}`)
      .join("; ")}

    User query: ${query}`;

    if (friendsData.length > 0) {
      prompt += `\n\nAdditionally, consider the following friends' information:

      ${friendsData
        .map(
          (friend, index) => `
      Friend ${index + 1}:
      Bio: ${friend.bio}
      Location: ${friend.city}, ${friend.state}
      Interests: ${friend.interests
        .map((i) => `${i.category}: ${i.items.join(", ")}`)
        .join("; ")}
      `
        )
        .join("\n")}

      Please provide a detailed recommendation that takes into account the user's and their friends' interests, locations, and bios. Focus on finding mutual interests and activities that would be enjoyable for the entire group.`;
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    res.json({ recommendation: completion.choices[0].message.content });
  } catch (error) {
    console.error("Error getting recommendation:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting the recommendation" });
  }
});

app.post(
  "/api/interests/add-item-from-chat",
  authMiddleware,
  async (req, res) => {
    try {
      const { userId, category, item } = req.body;

      // Verify user
      if (userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized action" });
      }

      // Fetch user's current interests
      const userInterestsQuery = await pool.query(
        "SELECT * FROM interests WHERE user_id = $1",
        [userId]
      );
      const userInterests = userInterestsQuery.rows;

      // Check if adding a new category
      const isNewCategory = !userInterests.some(
        (i) => i.category.toLowerCase() === category.toLowerCase()
      );

      // Determine the required tier based on current counts
      let requiredTier;
      if (isNewCategory) {
        if (userInterests.length < 3) requiredTier = PaymentTier.Free;
        else if (userInterests.length < 10) requiredTier = PaymentTier.Basic;
        else requiredTier = PaymentTier.Premium;
      } else {
        const categoryItems = await pool.query(
          "SELECT COUNT(*) FROM items WHERE interest_id = (SELECT id FROM interests WHERE user_id = $1 AND category = $2)",
          [userId, category]
        );
        const itemCount = parseInt(categoryItems.rows[0].count);

        if (itemCount < 5) requiredTier = PaymentTier.Free;
        else if (itemCount < 20) requiredTier = PaymentTier.Basic;
        else requiredTier = PaymentTier.Premium;
      }

      // Check if user has required tier
      const hasAccess = await checkPaymentTier(userId, requiredTier);
      if (!hasAccess) {
        return res.status(403).json({
          message:
            "Your current plan doesn't allow adding more interests or items. Please upgrade to add more.",
        });
      }

      // Add the category if it's new
      let categoryId;
      if (isNewCategory) {
        const newCategoryQuery = await pool.query(
          "INSERT INTO interests (user_id, category) VALUES ($1, $2) RETURNING id",
          [userId, category]
        );
        categoryId = newCategoryQuery.rows[0].id;
      } else {
        const existingCategoryQuery = await pool.query(
          "SELECT id FROM interests WHERE user_id = $1 AND category = $2",
          [userId, category]
        );
        categoryId = existingCategoryQuery.rows[0].id;
      }

      // Add the new item
      await pool.query(
        "INSERT INTO items (interest_id, name) VALUES ($1, $2)",
        [categoryId, item]
      );

      res.json({ message: "Interest item added successfully" });
    } catch (error) {
      console.error("Error adding interest item:", error);
      res
        .status(500)
        .json({ error: "An error occurred while adding the interest item" });
    }
  }
);

app.post("/api/geocode", async (req, res) => {
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

// Premium daily recommendations route
app.get("/api/recommendations/daily", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;

    // Check if user has Premium or Owner access
    const hasPremiumAccess = await checkPaymentTier(
      userId,
      PaymentTier.Premium
    );
    if (!hasPremiumAccess) {
      return res.status(403).json({
        error:
          "This feature is only available for Premium and Owner tier users",
      });
    }

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Start a transaction
    await client.query("BEGIN");

    // Check if we have cached recommendations for today
    const cachedRecommendations = await client.query(
      "SELECT recommendations FROM daily_recommendations WHERE user_id = $1 AND generated_at = $2",
      [userId, currentDate]
    );

    if (cachedRecommendations.rows.length > 0) {
      // Return cached recommendations
      await client.query("COMMIT");
      return res.json(cachedRecommendations.rows[0].recommendations);
    }

    // If no cached recommendations, generate new ones
    const userResult = await client.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    const user = userResult.rows[0];

    // Fetch user's interests
    const interestsResult = await client.query(
      "SELECT * FROM interests WHERE user_id = $1",
      [userId]
    );
    const interests = interestsResult.rows;

    // Get user's location
    const location = `${user.city || "Unknown"}, ${user.state || "Unknown"}`;

    // Generate prompt for OpenAI
    const prompt = `Generate personalized daily recommendations for a user with the following details:
    Today's Date: ${formattedDate}
    Location: ${location}
    Interests: ${interests.map((i) => i.category).join(", ")}
    Bio: ${user.bio || "Not provided"}

    Please provide 5 specific recommendations in the following format:
    %%% [Category]
    ** [Item Name] **
    [Detailed description including why it's recommended, any local events related to it, or if it's a new release]
    Rating: [1-10]

    Ensure recommendations are specific to the user's location, interests, and TODAY'S DATE (${formattedDate}).
    For local events, ONLY include events happening TODAY or VERY SOON (within the next few days).
    For music, movies, or other releases, ONLY include items released THIS WEEK.
    Double-check all dates and ensure they are accurate for TODAY'S DATE.
    Include local events, new releases in music/movies/TV shows, and other timely suggestions.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    const aiRecommendations = completion.choices[0].message.content;

    // Parse AI response
    const parsedRecommendations = parseAIResponse(aiRecommendations);

    // Delete previous recommendations
    await client.query(
      "DELETE FROM daily_recommendations WHERE user_id = $1 AND generated_at < $2",
      [userId, currentDate]
    );

    // Store the new recommendations in the database
    await client.query(
      "INSERT INTO daily_recommendations (user_id, recommendations, generated_at) VALUES ($1, $2, $3)",
      [userId, JSON.stringify(parsedRecommendations), currentDate]
    );

    // Commit the transaction
    await client.query("COMMIT");

    res.json(parsedRecommendations);
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query("ROLLBACK");
    console.error("Error generating daily recommendations:", error);
    res
      .status(500)
      .json({ error: "Server error while generating recommendations" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});

function parseAIResponse(aiResponse) {
  const recommendations = [];
  const sections = aiResponse.split("%%%").slice(1); // Split by %%% and remove first empty element

  sections.forEach((section, index) => {
    const [category, ...contentLines] = section.trim().split("\n");
    const content = contentLines.join("\n");

    const titleMatch = content.match(/\*\*(.*?)\*\*/);
    const ratingMatch = content.match(/Rating: (\d+(\.\d+)?)/);

    if (titleMatch && ratingMatch) {
      recommendations.push({
        id: index + 1,
        category: category.trim(),
        item: titleMatch[1].trim(),
        description: content
          .replace(/\*\*(.*?)\*\*/, "")
          .replace(/Rating: \d+(\.\d+)?/, "")
          .trim(),
        rating: parseFloat(ratingMatch[1]),
      });
    }
  });

  return recommendations;
}

app.post("/api/users/:userId/upgrade", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { newTier, paymentMethodId } = req.body;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let stripeCustomer = user.stripe_customer_id
      ? await stripe.customers.retrieve(user.stripe_customer_id)
      : await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });

    if (stripeCustomer.deleted) {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
    }

    await updateUserStripeCustomerId(user.id, stripeCustomer.id);

    // Attach the payment method to the customer
    await attachPaymentMethodToCustomer(stripeCustomer.id, paymentMethodId);

    const currentTier = PaymentTier[user.payment_tier];
    const newPriceId =
      newTier === PaymentTier.Basic
        ? process.env.STRIPE_BASIC_PRICE_ID
        : process.env.STRIPE_PREMIUM_PRICE_ID;

    let amount = 0;
    let proratedInfo = null;

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const currentSubscription = subscriptions.data[0];
      const currentPeriodEnd = new Date(
        currentSubscription.current_period_end * 1000
      );
      const now = new Date();
      const daysLeft = Math.ceil(
        (currentPeriodEnd - now) / (1000 * 60 * 60 * 24)
      );
      const totalDays = 30;

      if (
        currentTier === PaymentTier.Basic &&
        newTier === PaymentTier.Premium
      ) {
        proratedInfo = calculateProratedAmount(daysLeft, totalDays, 999, 1999);
        amount = proratedInfo.proratedAmount;
      }

      // Cancel existing subscription
      await cancelExistingSubscription(stripeCustomer.id);
    }

    // Create new subscription
    const newSubscription = await createNewSubscription(
      stripeCustomer.id,
      newPriceId
    );

    // If there's a prorated amount to charge, create a separate invoice item
    if (amount > 0) {
      await stripe.invoiceItems.create({
        customer: stripeCustomer.id,
        amount: amount,
        currency: "usd",
        description: "Prorated upgrade charge",
      });

      // Create and pay the invoice immediately
      const invoice = await stripe.invoices.create({
        customer: stripeCustomer.id,
        auto_advance: true,
      });
      await stripe.invoices.pay(invoice.id);
    }

    // Update user's subscription in the database
    await updateUserSubscription(user.id, newTier);

    // Send confirmation email
    const totalCharged = (
      (amount + newSubscription.items.data[0].price.unit_amount) /
      100
    ).toFixed(2);
    await sendSubscriptionConfirmation(
      user.email,
      totalCharged,
      new Date(newSubscription.current_period_end * 1000).toLocaleDateString()
    );

    res.json({
      success: true,
      message: "Upgrade successful",
      newTier: newTier,
      proratedInfo: proratedInfo,
      nextBillingDate: new Date(
        newSubscription.current_period_end * 1000
      ).toLocaleDateString(),
    });
  } catch (error) {
    console.error("Error processing upgrade:", error);
    res
      .status(500)
      .json({ error: error.message || "Error processing upgrade" });
  }
});

async function updateUserSubscription(userId, newTier) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Convert the numeric tier to its string representation
    const tierString = Object.keys(PaymentTier).find(
      (key) => PaymentTier[key] === newTier
    );

    // Update the user's payment tier and subscription_updated_at
    const updateUserQuery = `
      UPDATE users 
      SET payment_tier = $1, 
          subscription_updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
    const userResult = await client.query(updateUserQuery, [
      tierString,
      userId,
    ]);

    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }

    const updatedUser = userResult.rows[0];

    // Try to log the subscription change, but don't fail if the table doesn't exist
    try {
      const logSubscriptionChangeQuery = `
        INSERT INTO subscription_logs (user_id, old_tier, new_tier, changed_at)
        VALUES ($1, $2, $3, NOW())
      `;
      await client.query(logSubscriptionChangeQuery, [
        userId,
        PaymentTier[updatedUser.payment_tier],
        tierString,
      ]);
    } catch (logError) {
      console.warn("Failed to log subscription change:", logError.message);
      // Continue execution even if logging fails
    }

    // Update user privileges based on the new tier
    const updatePrivilegesQuery = `
      INSERT INTO user_privileges (user_id, max_interests, max_friends)
      VALUES ($1, 
        CASE 
          WHEN $2 = 'Premium' THEN 20 
          WHEN $2 = 'Basic' THEN 10 
          ELSE 3
        END,
        CASE 
          WHEN $2 = 'Premium' THEN 9999 
          WHEN $2 = 'Basic' THEN 10 
          ELSE 0
        END)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        max_interests = CASE 
          WHEN $2 = 'Premium' THEN 20 
          WHEN $2 = 'Basic' THEN 10 
          ELSE user_privileges.max_interests 
        END,
        max_friends = CASE 
          WHEN $2 = 'Premium' THEN 9999 
          WHEN $2 = 'Basic' THEN 10 
          ELSE user_privileges.max_friends 
        END
    `;
    await client.query(updatePrivilegesQuery, [userId, tierString]);

    await client.query("COMMIT");

    console.log(`User ${userId} subscription updated to ${tierString}`);
    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating user subscription:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to update user's Stripe customer ID
async function updateUserStripeCustomerId(userId, stripeCustomerId) {
  try {
    await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [
      stripeCustomerId,
      userId,
    ]);
  } catch (error) {
    console.error("Error updating user's Stripe customer ID:", error);
    throw error;
  }
}

// Add a new endpoint to handle successful payments
app.post(
  "/api/users/:userId/confirm-upgrade",
  authMiddleware,
  async (req, res) => {
    const { userId } = req.params;
    const { paymentIntentId, newTier } = req.body;

    try {
      // Verify the payment was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status === "succeeded") {
        // Update user in database
        await updateUserTier(userId, newTier);

        res.json({
          message: "Upgrade successful",
          user: await getUserById(userId),
        });
      } else {
        res.status(400).json({ error: "Payment was not successful" });
      }
    } catch (error) {
      console.error("Error confirming upgrade:", error);
      res.status(500).json({ error: "Error processing upgrade confirmation" });
    }
  }
);

app.post("/api/users/:userId/downgrade", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { newTier } = req.body;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentTier = PaymentTier[user.payment_tier];

    if (
      currentTier === PaymentTier.Free ||
      PaymentTier[newTier] >= currentTier
    ) {
      return res.status(400).json({ error: "Invalid downgrade request" });
    }

    const stripeCustomer = await stripe.customers.retrieve(
      user.stripe_customer_id
    );

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    const currentSubscription = subscriptions.data[0];
    const currentPeriodEnd = new Date(
      currentSubscription.current_period_end * 1000
    );

    // Schedule the downgrade
    await scheduleDowngrade(
      userId,
      newTier,
      currentSubscription.current_period_end
    );

    if (newTier === "FREE") {
      // Schedule cancellation at period end
      await stripe.subscriptions.update(currentSubscription.id, {
        cancel_at_period_end: true,
      });
    } else {
      // Schedule downgrade to Basic at period end
      const newPriceId = process.env.STRIPE_BASIC_PRICE_ID;

      await stripe.subscriptions.update(currentSubscription.id, {
        proration_behavior: "none",
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        billing_cycle_anchor: "unchanged",
      });
    }

    res.json({
      success: true,
      message: "Downgrade scheduled",
      newTier: newTier,
      effectiveDate: currentPeriodEnd.toISOString(),
    });
  } catch (error) {
    console.error("Error processing downgrade:", error);
    res
      .status(500)
      .json({ error: error.message || "Error processing downgrade" });
  }
});

// Helper functions

const scheduleDowngrade = async (userId, newTier, downgradeDateEpoch) => {
  const result = await pool.query(
    "INSERT INTO scheduled_downgrades (user_id, new_tier, downgrade_date) VALUES ($1, $2, to_timestamp($3)) RETURNING *",
    [userId, newTier, downgradeDateEpoch]
  );
  return result.rows[0];
};

// Fetch all scheduled downgrades that are due
const fetchScheduledDowngrades = async () => {
  const result = await pool.query(
    "SELECT * FROM scheduled_downgrades WHERE downgrade_date <= NOW()"
  );
  return result.rows;
};

async function sendAdminNotification(subject, message) {
  const msg = {
    to: "chris@integritytechsoftware.com",
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

async function handleSuccessfulPayment(invoice) {
  console.log("Payment succeeded:", invoice.id);

  try {
    const user = await getUserByStripeCustomerId(invoice.customer);
    if (!user) {
      throw new Error("User not found for Stripe customer");
    }

    // Update user's subscription status if necessary
    await updateUserSubscriptionStatus(user.id, "active");

    // Send confirmation email to the user
    const amount = (invoice.amount_paid / 100).toFixed(2); // Convert cents to dollars
    const date = new Date(invoice.created * 1000).toLocaleDateString();
    await sendSubscriptionConfirmation(user.email, amount, date);

    console.log(`Successful payment processed for user ${user.id}`);
  } catch (error) {
    console.error("Error handling successful payment:", error);
    await sendAdminNotification(
      "Error handling successful payment",
      `Invoice ${invoice.id}: ${error.message}`
    );
  }
}

async function handleFailedPayment(invoice) {
  console.log("Payment failed:", invoice.id);

  try {
    const user = await getUserByStripeCustomerId(invoice.customer);
    if (!user) {
      throw new Error("User not found for Stripe customer");
    }

    // Update user's subscription status
    await updateUserSubscriptionStatus(user.id, "past_due");

    // Send notification to admin
    await sendAdminNotification(
      "Payment failed",
      `Invoice ${invoice.id} payment failed for user ${user.id} (${user.email})`
    );

    console.log(`Failed payment recorded for user ${user.id}`);
  } catch (error) {
    console.error("Error handling failed payment:", error);
    await sendAdminNotification(
      "Error handling failed payment",
      `Invoice ${invoice.id}: ${error.message}`
    );
  }
}

async function handleSubscriptionUpdate(subscription) {
  console.log("Subscription updated:", subscription.id);

  try {
    const user = await getUserByStripeCustomerId(subscription.customer);
    if (!user) {
      throw new Error("User not found for Stripe customer");
    }

    // Update user's subscription details in your database
    const status = subscription.status;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    await updateUserSubscriptionStatus(user.id, status, currentPeriodEnd);

    // If the subscription was cancelled, schedule the downgrade
    if (subscription.cancel_at_period_end) {
      const cancelDate = new Date(subscription.cancel_at * 1000);
      await scheduleUserDowngrade(user.id, "Free", cancelDate);
    }

    console.log(`Subscription updated for user ${user.id}`);
  } catch (error) {
    console.error("Error handling subscription update:", error);
    await sendAdminNotification(
      "Error handling subscription update",
      `Subscription ${subscription.id}: ${error.message}`
    );
  }
}

app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "invoice.payment_succeeded":
        const paymentSucceeded = event.data.object;
        await handleSuccessfulPayment(paymentSucceeded);
        const subscription = await stripe.subscriptions.retrieve(
          event.data.object.subscription
        );
        const user = await getUserByStripeCustomerId(subscription.customer);
        await sendSubscriptionConfirmation(
          user.email,
          event.data.object.amount_paid / 100,
          new Date(subscription.current_period_end * 1000)
        );
        break;
      case "invoice.payment_failed":
        const paymentFailed = event.data.object;
        await handleFailedPayment(paymentFailed);
        break;
      case "customer.subscription.updated":
        const subscriptionUpdated = event.data.object;
        await handleSubscriptionUpdate(subscriptionUpdated);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

// Create a subscription when a user upgrades from free tier
const calculateProratedAmount = (
  daysLeft,
  totalDays,
  currentPrice,
  newPrice
) => {
  const percentageRemaining = daysLeft / totalDays;
  const proratedAmount = Math.round(
    (newPrice - currentPrice) * percentageRemaining
  );
  return {
    proratedAmount,
    daysRemaining: daysLeft,
    percentageRemaining: percentageRemaining.toFixed(2),
  };
};

const cancelExistingSubscription = async (customerId) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length > 0) {
    await stripe.subscriptions.del(subscriptions.data[0].id);
  }
};

const createNewSubscription = async (customerId, priceId) => {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    proration_behavior: "create_prorations",
  });
};

const attachPaymentMethodToCustomer = async (customerId, paymentMethodId) => {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
};

app.post("/api/update-payment-method", authMiddleware, async (req, res) => {
  const { paymentMethodId } = req.body;
  const userId = req.user.id;

  try {
    const user = await getUserById(userId);
    if (!user.stripe_customer_id) {
      throw new Error("User does not have a Stripe customer ID");
    }

    // Attach the new payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripe_customer_id,
    });

    // Set it as the default payment method
    await stripe.customers.update(user.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.json({ success: true, message: "Payment method updated successfully" });
  } catch (error) {
    console.error("Error updating payment method:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get("/api/subscription-status", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await getUserById(userId);

    // Check payment tier using the consistent method
    const isOwner = await checkPaymentTier(userId, PaymentTier.Owner);
    const isPremium = await checkPaymentTier(userId, PaymentTier.Premium);
    const isBasic = await checkPaymentTier(userId, PaymentTier.Basic);

    let plan;
    if (isOwner) {
      plan = "Owner";
    } else if (isPremium) {
      plan = "Premium";
    } else if (isBasic) {
      plan = "Basic";
    } else {
      plan = "Free";
    }

    // For paid tiers, fetch Stripe subscription details
    if (plan !== "Free" && plan !== "Owner" && user.stripe_customer_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: "all",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const status = subscription.status;
        const nextBillingDate = new Date(
          subscription.current_period_end * 1000
        ).toISOString();

        let scheduledDowngrade = null;
        if (subscription.cancel_at_period_end) {
          scheduledDowngrade = {
            newPlan: "Free",
            date: new Date(subscription.cancel_at * 1000).toISOString(),
          };
        }

        return res.json({
          plan,
          status,
          nextBillingDate,
          scheduledDowngrade,
        });
      }
    }

    // Default response for Free and Owner tiers, or if no Stripe subscription is found
    return res.json({
      plan,
      status: "active",
      nextBillingDate: null,
      scheduledDowngrade: null,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ message: "Error fetching subscription status" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  // Start the scheduled task after the server has started
  startScheduledTask();
});
