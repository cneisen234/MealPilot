const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const checkPaywall = require("../middleware/checkPaywall");

// Get selected meal type
router.get(
  "/selected-meal-type",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        "SELECT id, item FROM meal_types WHERE user_id = $1",
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error getting selected meal type:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Add selected meal type
router.post(
  "/selected-meal-type",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { item } = req.body;

      // First delete any existing meal type for this user
      await pool.query("DELETE FROM meal_types WHERE user_id = $1", [userId]);

      // Then add the new one
      const result = await pool.query(
        "INSERT INTO meal_types (user_id, item) VALUES ($1, $2) RETURNING id, item",
        [userId, item]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error adding selected meal type:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get selected servings
router.get(
  "/selected-servings",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        "SELECT id, item FROM selected_servings WHERE user_id = $1",
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error getting selected servings:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Add selected servings
router.post(
  "/selected-servings",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { item } = req.body;

      // First delete any existing servings for this user
      await pool.query("DELETE FROM selected_servings WHERE user_id = $1", [
        userId,
      ]);

      // Then add the new one
      const result = await pool.query(
        "INSERT INTO selected_servings (user_id, item) VALUES ($1, $2) RETURNING id, item",
        [userId, item]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error adding selected servings:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all can't haves for the logged-in user
router.get("/cant-haves", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, item FROM cant_haves WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting cant_haves:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new can't have
router.post("/cant-haves", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const { item } = req.body;

    if (!item || item.trim() === "") {
      return res.status(400).json({ message: "Item is required" });
    }

    const result = await pool.query(
      "INSERT INTO cant_haves (user_id, item) VALUES ($1, $2) RETURNING id, item",
      [userId, item.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res
        .status(400)
        .json({ message: "This item is already in your can't haves list" });
    }
    console.error("Error adding cant_have:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a can't have
router.delete(
  "/cant-haves/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.params.id;

      const result = await pool.query(
        "DELETE FROM cant_haves WHERE id = $1 AND user_id = $2 RETURNING id",
        [itemId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json({ message: "Item removed successfully" });
    } catch (error) {
      console.error("Error deleting cant_have:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all must haves for the logged-in user
router.get("/must-haves", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, item FROM must_haves WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting must_haves:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new must have
router.post("/must-haves", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const { item } = req.body;

    if (!item || item.trim() === "") {
      return res.status(400).json({ message: "Item is required" });
    }

    const result = await pool.query(
      "INSERT INTO must_haves (user_id, item) VALUES ($1, $2) RETURNING id, item",
      [userId, item.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res
        .status(400)
        .json({ message: "This item is already in your must haves list" });
    }
    console.error("Error adding must_have:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a must have
router.delete(
  "/must-haves/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.params.id;

      const result = await pool.query(
        "DELETE FROM must_haves WHERE id = $1 AND user_id = $2 RETURNING id",
        [itemId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json({ message: "Item removed successfully" });
    } catch (error) {
      console.error("Error deleting must_have:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all taste preference for the logged-in user
router.get("/taste", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, item FROM taste_preferences WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting taste_preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new taste preference
router.post("/taste", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const { item } = req.body;

    if (!item || item.trim() === "") {
      return res.status(400).json({ message: "Item is required" });
    }

    const result = await pool.query(
      "INSERT INTO taste_preferences (user_id, item) VALUES ($1, $2) RETURNING id, item",
      [userId, item.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(400).json({
        message: "This item is already in your taste preferences list",
      });
    }
    console.error("Error adding taste_preference:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a taste preference
router.delete(
  "/taste/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.params.id;

      const result = await pool.query(
        "DELETE FROM taste_preferences WHERE id = $1 AND user_id = $2 RETURNING id",
        [itemId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json({ message: "Item removed successfully" });
    } catch (error) {
      console.error("Error deleting taste_preference:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all dietary goals for the logged-in user
router.get("/goal", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, item FROM dietary_goals WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting dietary_goals:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new dietary goal
router.post("/goal", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const { item } = req.body;

    if (!item || item.trim() === "") {
      return res.status(400).json({ message: "Item is required" });
    }

    const result = await pool.query(
      "INSERT INTO dietary_goals (user_id, item) VALUES ($1, $2) RETURNING id, item",
      [userId, item.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(400).json({
        message: "This item is already in your dietary goal list",
      });
    }
    console.error("Error adding dietary_goals:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a dietary goal
router.delete("/goal/:id", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    const result = await pool.query(
      "DELETE FROM dietary_goals WHERE id = $1 AND user_id = $2 RETURNING id",
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item removed successfully" });
  } catch (error) {
    console.error("Error deleting dietary_goal:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all cuisine preferences for the logged-in user
router.get("/cuisine", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, item FROM cuisine_preferences WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting cuisine_preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new cuisine preference
router.post("/cuisine", [authMiddleware, checkPaywall], async (req, res) => {
  try {
    const userId = req.user.id;
    const { item } = req.body;

    if (!item || item.trim() === "") {
      return res.status(400).json({ message: "Item is required" });
    }

    const result = await pool.query(
      "INSERT INTO cuisine_preferences (user_id, item) VALUES ($1, $2) RETURNING id, item",
      [userId, item.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(400).json({
        message: "This item is already in your cuisine preferences list",
      });
    }
    console.error("Error adding cuisine_preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a cuisine preference
router.delete(
  "/cuisine/:id",
  [authMiddleware, checkPaywall],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.params.id;

      const result = await pool.query(
        "DELETE FROM cuisine_preferences WHERE id = $1 AND user_id = $2 RETURNING id",
        [itemId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json({ message: "Item removed successfully" });
    } catch (error) {
      console.error("Error deleting cuisine_preference:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
