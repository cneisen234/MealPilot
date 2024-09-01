const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  saveChatMessage,
  getChatHistory,
} = require("../utils/chatHistoryUtils");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await getChatHistory(userId);
    res.json(history);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, sender } = req.body;
    await saveChatMessage(userId, message, sender);
    res.status(201).json({ message: "Chat message saved successfully" });
  } catch (error) {
    console.error("Error saving chat message:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
