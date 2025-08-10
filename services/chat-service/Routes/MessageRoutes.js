const express = require("express");
const jwt = require("jsonwebtoken");
const Message = require("../Models/MessageModel");

const router = express.Router();

// Middleware to verify token
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Get chat history with a specific user
router.get("/:userId", auth, async (req, res) => {
  const { userId } = req.params;
  const messages = await Message.find({
    $or: [
      { sender: req.userId, receiver: userId },
      { sender: userId, receiver: req.userId }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);
});

module.exports = router;
