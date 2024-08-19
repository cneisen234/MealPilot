const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");
const cleanAIResponse = require("../cleanAiResponse");
const {
  generateRecommendationsWithRetry,
} = require("../utils/recommendationUtils");
const { checkPaymentTier } = require("../utils/paymentUtils");
const { DateTime } = require("luxon");

const PaymentTier = {
  Owner: 1,
  Premium: 2,
  Basic: 3,
  Free: 4,
};

router.post("/get-recommendation", authMiddleware, async (req, res) => {
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
    // Get current date and time
    const currentDateTime = DateTime.now().setZone(
      user.timezone || "America/New_York"
    );
    // Prepare the prompt for OpenAI
    let prompt = `Current date and time: ${currentDateTime.toFormat(
      "yyyy-MM-dd HH:mm:ss"
    )}

The user has asked the following question: "${query}"

Please provide a direct and specific answer to the user's question, taking into account their interests and location. If the question is about recommendations, ensure your recommendations are new and not already listed in their interests.

User Information:
Location: ${user.city}, ${user.state}
Current Interests: ${userInterests
      .map((i) => `${i.category}: ${i.items.join(", ")}`)
      .join("; ")}

IMPORTANT GUIDELINES:
1. Focus primarily on answering the user's specific question.
2. Ensure all information is accurate, up-to-date, and verifiable as of ${currentDateTime.toFormat(
      "MMMM d, yyyy"
    )}.
3. If recommending anything, make sure it's relevant to ${user.city}, ${
      user.state
    }.
4. Do not include any information you're unsure about.

Your response should be directly related to the user's question. If recommending books, activities, or anything else, provide 3-5 specific suggestions that:
1. Directly answer the user's query
2. Are new to the user (not in their current interests)
3. Relate to their location and current interests where relevant

For each suggestion, briefly explain:
1. What it is
2. Why it's relevant to the user's question and interests
3. How it provides a fresh perspective or new experience

Remember: Accuracy and relevance to the user's question are the most important factors.`;

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

      Please provide 3-5 detailed recommendations for NEW group activities or interests that:
      1. Are not already listed in any of the users' current interests
      2. Are specifically relevant to the users' locations, focusing on ${
        user.city
      }, ${user.state}
      3. Align with the collective interests and bios of the group
      4. Are appropriate for the current season and time of year
      5. Provide a fresh and engaging experience for the entire group

      For each group recommendation, provide:
      1. The name of the group activity or interest
      2. A brief explanation of what it involves
      3. Why it's a good fit for the group based on their collective profiles
      4. How it combines or expands upon their diverse interests
      5. Any specific local resources or venues in ${user.city}, ${
        user.state
      } related to this recommendation (only if you're certain they exist)

      Ensure all group recommendations adhere to the same accuracy and verification guidelines mentioned earlier.`;
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    res.json({
      recommendation: cleanAIResponse(completion.choices[0].message.content),
    });
  } catch (error) {
    console.error("Error getting recommendation:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting the recommendation" });
  }
});

router.get("/daily", authMiddleware, async (req, res) => {
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

    // If no cached recommendations, generate new ones with retry logic
    const recommendations = await generateRecommendationsWithRetry(
      client,
      userId,
      currentDate
    );

    if (recommendations.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message:
          "Unable to generate recommendations at this time. Please try again later.",
      });
    }

    // Store the new recommendations in the database
    await client.query(
      "INSERT INTO daily_recommendations (user_id, recommendations, generated_at) VALUES ($1, $2, $3)",
      [userId, JSON.stringify(recommendations), currentDate]
    );

    // Commit the transaction
    await client.query("COMMIT");

    res.json(recommendations);
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

module.exports = router;
