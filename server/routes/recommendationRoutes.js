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
      "SELECT id, name, bio, city, state FROM users WHERE id = $1",
      [userId]
    );
    const user = userQuery.rows[0];

    // Fetch user interests
    const userInterestsQuery = await pool.query(
      "SELECT i.category, json_agg(json_build_object('name', it.name, 'rating', it.rating)) as items FROM interests i JOIN items it ON i.id = it.interest_id WHERE i.user_id = $1 GROUP BY i.category",
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
        "SELECT id, name, bio, city, state FROM users WHERE id = ANY($1)",
        [friendIds]
      );
      friendsData = friendsQuery.rows;

      // Fetch friends' interests
      for (let friend of friendsData) {
        const friendInterestsQuery = await pool.query(
          "SELECT i.category, json_agg(json_build_object('name', it.name, 'rating', it.rating)) as items FROM interests i JOIN items it ON i.id = it.interest_id WHERE i.user_id = $1 GROUP BY i.category",
          [friend.id]
        );
        friend.interests = friendInterestsQuery.rows;
      }
    }

    const currentDateTime = DateTime.now().setZone(
      user.timezone || "America/New_York"
    );

    // Prepare the prompt for OpenAI
    let prompt = `Hey there, Lena! It's ${currentDateTime.toFormat(
      "MMMM d, yyyy"
    )} at ${currentDateTime.toFormat(
      "h:mm a"
    )}, and we've got an interesting question from ${
      friendsData.length > 0 ? "a group of friends" : "someone"
    }. Here's what they're asking:

"${query}"

I'll fill you in on ${friendsData.length > 0 ? "these folks" : "this person"}:

Primary User (${user.name}):
Location: ${user.city}, ${user.state}
Current Interests: ${userInterests
      .map(
        (i) =>
          `${i.category}: ${i.items
            .map((item) => `${item.name} (Rating: ${item.rating}/10)`)
            .join(", ")}`
      )
      .join("; ")}
${
  friendsData.length > 0
    ? `
Additional Group Members:
${friendsData
  .map(
    (friend, index) => `
${friend.name}:
Location: ${friend.city}, ${friend.state}
Interests: ${friend.interests
      .map(
        (i) =>
          `${i.category}: ${i.items
            .map((item) => `${item.name} (Rating: ${item.rating}/10)`)
            .join(", ")}`
      )
      .join("; ")}
`
  )
  .join("\n")}
`
    : ""
}

Alright, here's what I need from you. Keep it friendly and casual, like you're chatting with a buddy, but make sure to follow these guidelines and make sure to follow this exact format for each one:

[Number]. [Recommendation Title]

What's the idea: [Brief description of the recommendation]

Why would you dig it: [Explanation referencing their interests and ratings]

Fresh experience: [Explain how it provides a new perspective]

Confidence: [Just say High, Medium, or Low]

CRITICAL GUIDELINES:
1. Accuracy is key, my friend. Only share stuff you're absolutely sure about.
2. When you look at those interest ratings, here's what they mean:
   - 10: You're obsessed with this!
   - 7-9: You really love it
   - 4-6: You like it well enough
   - 1-3: It's okay, but not you're favorite
3. Try to focus on the higher-rated interests, but don't completely ignore the lower ones. They might be up for trying something new!
4. It's cool to give fewer recommendations if it means they're spot-on.
5. Stick to answering their specific question.
6. Make sure everything you say is up-to-date as of ${currentDateTime.toFormat(
      "MMMM d, yyyy"
    )}.
7. If you're suggesting anything, make sure it fits with ${
      user.name
    }'s location (${user.city}, ${user.state})${
      friendsData.length > 0 ? " and works for where their friends are too" : ""
    }.
8. If you're not sure about something, just say so. It's totally fine!

Now, when you're giving your answer, try to suggest 1-3 cool ideas that:
1. Actually answer what they're asking
2. Are new to ${user.name}${
      friendsData.length > 0 ? ` and their friends` : ""
    } (not stuff they already mentioned)
3. Match up with where they are and what they're into, keeping those ratings in mind
${friendsData.length > 0 ? `4. Would be fun for everyone in the group` : ""}

For each suggestion, break it down like this:
1. What's the idea?
2. Why would ${user.name}${
      friendsData.length > 0 ? ` and their friends` : ""
    } dig it? (Think about those ratings!)
3. How's it going to give them a fresh experience?
4. How sure are you about this recommendation? (Just say High, Medium, or Low)

Remember, if you've only got one awesome idea, that's totally fine! ${
      friendsData.length > 0
        ? `And since we're dealing with a group, try to find that sweet spot that'll make everyone happy, based on what they're all into.`
        : ""
    }

Keep it real and friendly, like you're just chatting with a buddy. Ready? Let's hear what you've got!`;

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
