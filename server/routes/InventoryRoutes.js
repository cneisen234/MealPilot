const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const openai = require("../openai");
const pool = require("../db");
const vision = require("@google-cloud/vision");
const client = new vision.ImageAnnotatorClient({
  credentials: {
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  },
});

// Get all inventory items for the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT * FROM inventory WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting inventory:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const determineExpirationDate = (existingDate, newDate) => {
  if (existingDate && newDate) {
    // If both have dates, use the earlier one
    return new Date(existingDate) < new Date(newDate) ? existingDate : newDate;
  }
  // If only one has a date, use that one
  return existingDate || newDate || null;
};

// Regular inventory POST route
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const inventoryCount = await pool.query(
      "SELECT COUNT(*) FROM inventory WHERE user_id = $1",
      [userId]
    );

    if (inventoryCount.rows[0].count >= 200) {
      return res.status(400).json({
        message: "Inventory limit reached. Maximum 200 items allowed.",
      });
    }
    const { item_name, quantity } = req.body;
    let { expiration_date } = req.body;

    if (expiration_date === "") {
      expiration_date = null;
    }

    if (!item_name || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Item name and quantity are required" });
    }

    await pool.query("BEGIN");

    // Check for existing item with same name
    const existingItem = await pool.query(
      "SELECT id, quantity, expiration_date FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
      [userId, item_name.trim()]
    );

    let result;

    if (existingItem.rows.length > 0) {
      const currentItem = existingItem.rows[0];

      // Determine which expiration date to use
      const finalExpirationDate = determineExpirationDate(
        currentItem.expiration_date,
        expiration_date
      );

      // Add quantities and update with appropriate expiration date
      const newQuantity = Number(quantity) + Number(currentItem.quantity);

      result = await pool.query(
        `UPDATE inventory 
         SET quantity = $1, expiration_date = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [newQuantity, finalExpirationDate, currentItem.id, userId]
      );
    } else {
      // New item, insert with provided expiration date
      result = await pool.query(
        `INSERT INTO inventory (user_id, item_name, quantity, expiration_date) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userId, item_name.trim(), quantity, expiration_date]
      );
    }

    await pool.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error adding inventory item:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update an inventory item
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { item_name, quantity } = req.body;
    let { expiration_date } = req.body;

    if (expiration_date === "" || expiration_date === "NaN-NaN-NaN") {
      expiration_date = null;
    }

    if (!item_name || quantity === undefined) {
      return res.status(400).json({
        message: "Item name and quantity are required",
      });
    }

    await pool.query("BEGIN");

    // If quantity is 0 or less, delete the item
    if (Number(quantity) <= 0) {
      await pool.query("DELETE FROM inventory WHERE id = $1 AND user_id = $2", [
        itemId,
        userId,
      ]);

      await pool.query("COMMIT");
      return res.json({
        message: "Item removed due to zero or negative quantity",
      });
    }

    // Update item with quantity
    const result = await pool.query(
      `UPDATE inventory 
       SET item_name = $1, 
           quantity = $2, 
           expiration_date = $3, 
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [item_name.trim(), quantity, expiration_date, itemId, userId]
    );

    if (result.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }

    await pool.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error updating inventory item:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// Delete an inventory item
router.put("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { quantity } = req.body; // Get incoming quantity

    await pool.query("BEGIN");

    // Get current item
    const currentItem = await pool.query(
      "SELECT quantity FROM inventory WHERE id = $1 AND user_id = $2",
      [itemId, userId]
    );

    if (currentItem.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }

    // If incoming quantity is less than current, update instead of delete
    if (Number(quantity) < currentItem.rows[0].quantity) {
      const remainingQty = currentItem.rows[0].quantity - Number(quantity);

      const result = await pool.query(
        `UPDATE inventory 
         SET quantity = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [remainingQty, itemId, userId]
      );

      await pool.query("COMMIT");
      return res.json({
        message: "Item quantity updated",
        item: result.rows[0],
      });
    }

    // If incoming quantity is >= current quantity, delete the item
    await pool.query("DELETE FROM inventory WHERE id = $1 AND user_id = $2", [
      itemId,
      userId,
    ]);

    await pool.query("COMMIT");
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error deleting inventory item:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

router.put("/delete-by-name/:itemName", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemName = req.params.itemName;
    const { quantity } = req.body;

    // Start a transaction
    await pool.query("BEGIN");

    // First get the current quantity
    const currentItem = await pool.query(
      "SELECT quantity FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
      [userId, itemName]
    );

    if (currentItem.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found" });
    }

    const remainingQuantity = currentItem.rows[0].quantity - quantity;

    if (remainingQuantity <= 0) {
      // Delete the item if quantity would be zero or less
      await pool.query(
        "DELETE FROM inventory WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)",
        [userId, itemName]
      );
    } else {
      // Update the quantity if there's still some remaining
      await pool.query(
        "UPDATE inventory SET quantity = $1 WHERE user_id = $2 AND LOWER(item_name) = LOWER($3)",
        [remainingQuantity, userId, itemName]
      );
    }

    await pool.query("COMMIT");
    res.json({
      message:
        remainingQuantity <= 0 ? "Item removed" : "Item quantity updated",
      remainingQuantity: remainingQuantity > 0 ? remainingQuantity : 0,
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error updating inventory item:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/analyze-item", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ message: "Image data is required" });
    }

    // Check if imageData is a valid base64 string
    if (!/^data:image\/[a-z]+;base64,/.test(imageData)) {
      return res.status(400).json({ message: "Invalid image data format" });
    }

    // Clean up base64 image data
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    // Get inventory items from the database
    const userItems = await pool.query(
      "SELECT * FROM inventory WHERE user_id = $1",
      [userId]
    );

    // 1. Use Google Vision API to analyze the image
    const [result] = await client.labelDetection({
      image: { content: Buffer.from(base64Image, "base64") },
    });

    const labels = result.labelAnnotations;

    if (!labels || labels.length === 0) {
      return res
        .status(400)
        .json({ message: "No labels detected in the image" });
    }

    // Filter the labels to only include high-confidence ones
    const concepts = labels
      .filter((label) => label.score > 0.3) // You can adjust the threshold (0.3) as needed
      .map((label) => ({
        name: label.description,
        confidence: (label.score * 100).toFixed(1),
      }));

    if (concepts.length === 0) {
      return res.status(400).json({ message: "No relevant concepts detected" });
    }

    // 2. Use GPT to find inventory matches based on Google Vision results
    const gptPrompt = `Based on these image recognition results:
${concepts.map((c) => `${c.name} (${c.confidence}% confidence)`).join("\n")}

And these inventory items:
${userItems.rows.map((item) => item.item_name).join("\n")}

Identify the most specific item name and find matches from the inventory list.

Return a JSON object with this structure:
{
  "itemName": "most specific item name",
  "inventoryMatches": ["exact", "matches", "from", "inventory"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a precise inventory matching expert.",
        },
        {
          role: "user",
          content: gptPrompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    if (!analysis.itemName || !analysis.inventoryMatches) {
      return res.status(400).json({ message: "Error parsing GPT response" });
    }

    // 3. Find the actual inventory items that match
    const matches = userItems.rows.filter((item) =>
      analysis.inventoryMatches.includes(item.item_name)
    );

    res.json({
      exists: matches.length > 0,
      matches,
      suggestedName: analysis.itemName,
    });
  } catch (error) {
    console.error("Error analyzing item photo:", error);
    if (error.response) {
      // Error coming from an API
      return res
        .status(error.response.status)
        .json({ message: error.response.data.message });
    } else {
      // Other errors (e.g., network or GPT errors)
      return res
        .status(500)
        .json({ message: "Error analyzing photo", error: error.message });
    }
  }
});

module.exports = router;
