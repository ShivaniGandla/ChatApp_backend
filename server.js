const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const Message = require("./models/Message");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://chatappfe.netlify.app", // Replace with your actual frontend link
    methods: ["GET", "POST"],
  },
});

const users = {};

io.on("connection", async (socket) => {
  console.log("🟢 Connected:", socket.id);

  // Send previous messages to new user
  try {
    const previousMessages = await Message.find().sort({ createdAt: 1 }).limit(50);
    socket.emit("previous-messages", previousMessages);
  } catch (error) {
    console.error("Error loading messages:", error);
  }

  // User joins
  socket.on("user-joined", (username) => {
    users[socket.id] = username;
    console.log(`👤 ${username} joined`);
    socket.broadcast.emit("user-joined", username);
  });

  // User sends message
  socket.on("send-message", async (data) => {
    const { username, text } = data;
    try {
      const message = new Message({ username, text });
      await message.save();
      io.emit("chat-message", data);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  // Typing indicator
  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  // User disconnects
  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      console.log(`🔴 ${username} left`);
      socket.broadcast.emit("user-left", username);
      delete users[socket.id];
    }
  });
});

// Health check route
app.get("/", (req, res) => {
  res.send("✅ ChatApp Backend is running successfully!");
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`⚡ Server running on port ${PORT}`));