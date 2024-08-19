const openai = require("../openai");
const { parseAIResponse } = require("../utils/miscUtils");

// Premium daily recommendations route
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds delay between retries

async function generateRecommendations(client, userId, currentDate) {
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

  // Generate prompt for OpenAI
  const prompt = `Generate personalized daily recommendations for a user with the following details:
    Today's Date: ${currentDate.toISOString().split("T")[0]}
    Location: ${user.city}, ${user.state}
    Interests: ${interests.map((i) => i.category).join(", ")}

    Please provide 5 specific recommendations in the following format:
    %%% [Category]
    ** [Item Name] **
    [Detailed description including why it's recommended, any local events related to it, or if it's a new release]
    Confidence: [1-10]
    Rating: [1-10]

    IMPORTANT GUIDELINES:
    - Ensure all recommendations are accurate and up-to-date as of ${
      currentDate.toISOString().split("T")[0]
    }. But DO NOT give any information to the user on what these dates or when certain events are happening
    - DO NOT mention any specific dates, times, or suggest something is upcoming or happening soon.
    - Focus on describing what the recommendation is, not when it happens.
    - Only include events, releases, or news from the past week or upcoming week.
    - Double-check all dates, locations, and facts before including them.
    - If you're unsure about any information, provide a lower confidence score.
    - For local recommendations, only suggest verified, currently operating businesses or events.
    - Do not make assumptions about local events or businesses without verification.
    - The confidence score should reflect how certain you are about the accuracy and relevance of the recommendation.

    Remember: Accuracy is more important than quantity. If you can only confidently provide 3 recommendations, that's fine.`;

  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const aiRecommendations = completion.choices[0].message.content;

  // Parse AI response
  return parseAIResponse(aiRecommendations);
}

async function generateRecommendationsWithRetry(client, userId, currentDate) {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const recommendations = await generateRecommendations(
        client,
        userId,
        currentDate
      );
      if (recommendations.length > 0) {
        return recommendations;
      }
      console.log(
        `Attempt ${attempt}: No recommendations generated. Retrying...`
      );
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
    }

    if (attempt < MAX_RETRY_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return []; // Return empty array if all attempts fail
}

module.exports = {
  generateRecommendationsWithRetry,
};
