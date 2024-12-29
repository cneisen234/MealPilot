const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
const openai = require("../openai");
const cleanAIResponse = require("../cleanAiResponse");

router.post("/create-recipe", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.body;

    // Fetch user data
    const userQuery = await pool.query(
      "SELECT id, name, bio, city, state FROM users WHERE id = $1",
      [userId]
    );
    const user = userQuery.rows[0];

    // TODO: Write this to fetch user's can't haves
    // const cantHavesQuery = await pool.query(
    //   "SELECT i.category, json_agg(json_build_object('name', it.name, 'rating', it.rating)) as items FROM interests i JOIN items it ON i.id = it.interest_id WHERE i.user_id = $1 GROUP BY i.category",
    //   [userId]
    // );
    // const cantHaves = userInterestsQuery.rows;

    // Prepare the prompt for OpenAI
    //TODO: Rework this to recommend recipes
    let prompt = `Hey there! We've got an interesting question from ${user.name} Here's what they're asking:

"${query}"
`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const recipeText = completion.choices[0].message.content;
    const cleanedRecommendation = cleanAIResponse(recipeText);

    res.json({ recommendation: cleanedRecommendation });
  } catch (error) {
    console.error("Error getting recommendation:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting the recommendation" });
  }
});

module.exports = router;
