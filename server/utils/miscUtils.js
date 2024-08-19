const pool = require("../db");

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

function parseAIResponse(aiResponse) {
  const recommendations = [];
  const sections = aiResponse.split("%%%").slice(1); // Split by %%% and remove first empty element

  sections.forEach((section, index) => {
    const [category, ...contentLines] = section.trim().split("\n");
    const content = contentLines.join("\n");

    const titleMatch = content.match(/\*\*(.*?)\*\*/);
    const confidenceMatch = content.match(/Confidence: (\d+)/);
    const ratingMatch = content.match(/Rating: (\d+)/);

    if (titleMatch && confidenceMatch && ratingMatch) {
      recommendations.push({
        id: index + 1,
        category: category.trim(),
        item: titleMatch[1].trim(),
        description: content
          .replace(/\*\*(.*?)\*\*/, "")
          .replace(/Confidence: \d+/, "")
          .replace(/Rating: \d+/, "")
          .trim(),
        confidence: parseInt(confidenceMatch[1]),
        rating: parseInt(ratingMatch[1]),
      });
    }
  });

  return recommendations;
}

module.exports = {
  checkPromptLimit,
  parseAIResponse,
};
