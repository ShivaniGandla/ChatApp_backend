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

// ✅ Health check route for testing MongoDB with Postman
app.post("/test/add", async (req, res) => {
  try {
    const msg = await Message.create({
      username: "Postman",
      text: "Hello from Postman!",
    });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route to fetch all messages for testing
app.get("/test/all", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://melodious-dango-453826.netlify.app", // ✅ your deployed frontend
    methods: ["GET", "POST"],
  },
});

const users = {};

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("user-joined", (username) => {
    users[socket.id] = username;
    socket.broadcast.emit("user-joined", username);
  });

  socket.on("send-message", async (data) => {
    try {
      await Message.create(data); // ✅ Save message to DB
      io.emit("chat-message", data);
    } catch (err) {
      console.error("❌ Error saving message:", err.message);
    }
  });

  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      socket.broadcast.emit("user-left", username);
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`⚡ Server running on port ${PORT}`));