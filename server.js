const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend to connect
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

  socket.on("send-message", (data) => {
    io.emit("chat-message", data); // send to all including sender
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