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

// ✅ Allow both localhost and deployed frontend (add your Netlify URL later)
const allowedOrigins = [
  "http://localhost:3000",
  // "https://your-frontend.netlify.app",  // add this once deployed
];

// ✅ CORS setup
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.includes(origin)) {
        return callback(
          new Error(`Origin ${origin} not allowed by CORS policy`),
          false
        );
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ✅ Root route for Render check
app.get("/", (req, res) => {
  res.send("🚀 ChatApp backend is running!");
});

const server = http.createServer(app);

// ✅ Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const users = {};

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // ✅ When a user joins
  socket.on("user-joined", (username) => {
    users[socket.id] = username;
    console.log(`👤 ${username} joined`);
    socket.broadcast.emit("user-joined", username);
  });

  // ✅ When a message is sent
  socket.on("send-message", (data) => {
    io.emit("chat-message", data); // send to everyone including sender
  });

  // ✅ When someone is typing
  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username); // everyone except typer
  });

  // ✅ When a user disconnects
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