import { Server } from "socket.io";
import express from "express";
import http from "http";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173",process.env.CLIENT_URL],
        methods: ["GET", "POST", "DELETE"],
        credentials: true
    },
});
const userSocketMap = {};

export const getReciverId = (receiverId) => userSocketMap[receiverId];

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`user connected ${userId}, socket id ${socket.id}`);
  }
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    if (userId) {
      delete userSocketMap[userId];
      console.log(`user disconnected ${userId}, socket id ${socket.id}`);
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // Video offer
  socket.on("video-offer", ({ to, offer }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("video-offer", {
        from: userId,
        offer,
      });
    }
  });

  // Video answer
  socket.on("video-answer", ({ to, answer }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("video-answer", {
        from: userId,
        answer,
      });
    }
  });

  // ICE candidate
  socket.on("ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", {
        from: userId,
        candidate,
      });
    }
  });

  // Call rejected
  socket.on("call-rejected", ({ to }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-rejected", {
        from: userId,
      });
    }
  });

  // Call ended
  socket.on("call-ended", ({ to }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-ended", {
        from: userId,
      });
    }
  });
});

export {app,server,io};