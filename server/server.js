const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middleware/auth");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is connected!" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch the user from the database
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = result.rows[0];

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Error during login" });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, username, password, bio } = req.body;

  try {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    const result = await pool.query(
      "INSERT INTO users (name, username, password, bio) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, username, hashedPassword, bio]
    );

    res.status(201).json({
      message: "User created successfully",
      userId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Error creating user" });
  }
});

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

app.get("/users", authMiddleware, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users
app.get("/api/users", authMiddleware, (req, res) => {
  res.json(users);
});

// Get user by id
app.get("/api/users/:id", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// Get interests for a user
app.get("/api/users/:id/interests", authMiddleware, (req, res) => {
  const userInterests = interests.filter(
    (i) => i.userId === parseInt(req.params.id)
  );
  res.json(userInterests);
});

// Add a new interest
app.post("/api/interests", authMiddleware, (req, res) => {
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
app.post("/api/recommend", authMiddleware, (req, res) => {
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
