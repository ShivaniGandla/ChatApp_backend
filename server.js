const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const users = {};

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("user-joined", (username) => {
    users[socket.id] = username;
    console.log(`👤 ${username} joined`);
    // notify everyone except the user
    socket.broadcast.emit("user-joined", username);
  });

  socket.on("send-message", (data) => {
    // ✅ Send to everyone (including sender)
    io.emit("chat-message", data);
  });

  socket.on("typing", (username) => {
    // ✅ Notify everyone except the one typing
    socket.broadcast.emit("typing", username);
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      console.log(`🔴 ${username} left`);
      socket.broadcast.emit("user-left", username);
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`⚡ Server running on port ${PORT}`));