const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Dummy data
const users = [
  { id: 1, username: "user1", email: "user1@example.com" },
  { id: 2, username: "user2", email: "user2@example.com" },
];

const interests = [
  {
    id: 1,
    userId: 1,
    category: "Movies",
    item: "The Shawshank Redemption",
    rating: 9,
  },
  {
    id: 2,
    userId: 1,
    category: "Books",
    item: "To Kill a Mockingbird",
    rating: 8,
  },
  { id: 3, userId: 2, category: "Music", item: "The Beatles", rating: 10 },
  { id: 4, userId: 2, category: "Sports", item: "Basketball", rating: 7 },
];

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Interest AI API" });
});

// Get all users
app.get("/api/users", (req, res) => {
  res.json(users);
});

// Get user by id
app.get("/api/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// Get interests for a user
app.get("/api/users/:id/interests", (req, res) => {
  const userInterests = interests.filter(
    (i) => i.userId === parseInt(req.params.id)
  );
  res.json(userInterests);
});

// Add a new interest
app.post("/api/interests", (req, res) => {
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

// Dummy AI recommendation
app.post("/api/recommend", (req, res) => {
  const { userId } = req.body;
  const userInterests = interests.filter((i) => i.userId === parseInt(userId));
  const categories = [...new Set(userInterests.map((i) => i.category))];

  const recommendations = categories.map((category) => ({
    category,
    recommendation: `AI recommended ${category} item`,
  }));

  res.json(recommendations);
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
