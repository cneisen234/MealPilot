const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");

router.post("/", authMiddleware, async (req, res) => {
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

router.delete("/:categoryId", authMiddleware, async (req, res) => {
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

    // Delete the items associated with the category
    await client.query("DELETE FROM items WHERE interest_id = $1", [
      categoryId,
    ]);

    // Delete the category
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

router.post("/:categoryId/items", authMiddleware, async (req, res) => {
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
});

router.delete(
  "/:categoryId/items/:itemId",
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

router.put("/:categoryId/items/:itemId", authMiddleware, async (req, res) => {
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
});

module.exports = router;
