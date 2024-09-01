const openai = require("../openai");
const pool = require("../db");

const { parseAIResponse } = require("../utils/miscUtils");

// Premium daily recommendations route
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds delay between retries

async function saveRecommendation(userId, recommendationName) {
  const query = `
    INSERT INTO recent_recommendations (user_id, recommendation_name)
    VALUES ($1, $2)
  `;
  await pool.query(query, [userId, recommendationName]);
}

async function getRecentRecommendations(userId) {
  const query = `
    SELECT recommendation_name
    FROM recent_recommendations
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '2 weeks'
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.map((row) => row.recommendation_name);
}

async function generateRecommendations(client, userId, currentDate) {
  const userResult = await client.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  const user = userResult.rows[0];

  const recentRecommendations = await getRecentRecommendations(userId);

  // Fetch user's interests with ratings
  const interestsResult = await client.query(
    "SELECT i.category, json_agg(json_build_object('name', it.name, 'rating', it.rating)) as items FROM interests i JOIN items it ON i.id = it.interest_id WHERE i.user_id = $1 GROUP BY i.category",
    [userId]
  );
  const interests = interestsResult.rows;

  // Generate prompt for OpenAI
  const prompt = `Hey there, Lena! It's ${
    currentDate.toISOString().split("T")[0]
  }, and we've got a fun task today. We're gonna cook up some personalized daily recommendations for our friend ${
    user.name
  }. Let me give you the lowdown on them:

Name: ${user.name}
Hangout Spot: ${user.city}, ${user.state}
Things They're Into: ${interests
    .map(
      (i) =>
        `${i.category}: ${i.items
          .map((item) => `${item.name} (Rating: ${item.rating}/10)`)
          .join(", ")}`
    )
    .join("; ")}

Now, here's what I need from you. I want you to come up with 1-5 awesome recommendations for ${
    user.name
  }. But here's the kicker - we need to format these in a specific way. For each recommendation, do it like this:

%%% [Category]
** [Item Name] **
[Give me a cool description here. Why would ${
    user.name
  } love this? Is there anything local that ties into it? Maybe it's a hot new release? Spill the beans!]
Confidence: [1-10]
Rating: [1-10]

Recent recommendations to avoid: ${recentRecommendations.join(", ")}

Alright, now listen up, 'cause this part's important:

CRITICAL GUIDELINES:
- Accuracy is key, my friend. Only suggest stuff you're absolutely sure about.
- When you look at those interest ratings, here's what they mean:
  - 10: They're obsessed with this!
  - 7-9: They really love it
  - 4-6: They like it well enough
  - 1-3: It's okay, but not their favorite
- Try to focus on the higher-rated interests, but don't completely ignore the lower ones. They might be up for trying something new!
- It's cool to give fewer recommendations if it means they're spot-on.
- Make sure everything you suggest is current as of ${
    currentDate.toISOString().split("T")[0]
  }.
- Don't mention specific dates or times, and don't say something's "coming up soon".
- Focus on what the recommendation is, not when it's happening.
- Only include events, releases, or news from the last week or next week if you're 100% sure about them.
- Double-check all the locations and facts before you include them.
- For local recommendations, only suggest businesses or events you know for sure are operating.
- Don't make guesses about local stuff without being certain.
- When you give that confidence score, make it reflect how sure you are about the accuracy and relevance of your recommendation. Only use high scores (8-10) for stuff you're really, really certain about.
- If you're not super confident about a recommendation, it's better to leave it out.
- If you find that all your initial ideas are in the list to avoid, please come up with different recommendations. Be creative!
- If you're absolutely uncertain in your confidence in any of the recommendations. At least give one that you are most confident about. If you absolutely have to you can give a recommendation from the list to avoid in order to provide at least one, that's fine. however only do this as a last resort and even if you do, put a unique spin on it.

Remember, if you've only got one fantastic idea, that's totally fine! We're all about quality over quantity here.

Oh, and one last thing - keep it real and friendly, like you're just chatting with a buddy. Ready? Let's hear what you've got for ${
    user.name
  }!`;

  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const aiRecommendations = completion.choices[0].message.content;

  // Parse AI response
  const parsedRecommendations = parseAIResponse(aiRecommendations);

  // Save new recommendations and filter out duplicates
  const uniqueRecommendations = [];
  for (const rec of parsedRecommendations) {
    if (!recentRecommendations.includes(rec.item)) {
      await saveRecommendation(userId, rec.item);
      uniqueRecommendations.push(rec);
    }
  }

  return uniqueRecommendations;
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
  saveRecommendation,
  getRecentRecommendations,
};
