import { Server } from "socket.io";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", process.env.CLIENT_URL],
        methods: ["GET", "POST", "DELETE"],
        credentials: true
    },
    // Enhanced Socket.IO configuration for better WebRTC support
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    // Increase max payload size for large SDP messages
    maxHttpBufferSize: 1e6,
});

const userSocketMap = {};
const activeCallsMap = {}; // Track active calls

export const getReciverId = (receiverId) => userSocketMap[receiverId];

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);
  }
  
  // Emit updated online users list
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${userId}, Socket ID: ${socket.id}, Reason: ${reason}`);
    
    if (userId) {
      // Clean up active calls when user disconnects
      const activeCall = activeCallsMap[userId];
      if (activeCall) {
        const otherUserId = activeCall.caller === userId ? activeCall.callee : activeCall.caller;
        const otherUserSocketId = getReciverId(otherUserId);
        
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("call-ended", {
            from: userId,
            reason: "user_disconnected"
          });
        }
        
        // Clean up both users from active calls
        delete activeCallsMap[userId];
        delete activeCallsMap[otherUserId];
      }
      
      delete userSocketMap[userId];
    }
    
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // Video offer with enhanced error handling
  socket.on("video-offer", ({ to, offer }) => {
    try {
      const receiverSocketId = getReciverId(to);
      
      if (!receiverSocketId) {
        socket.emit("call-error", { 
          error: "User not found or offline",
          code: "USER_NOT_FOUND"
        });
        return;
      }

      // Check if either user is already in a call
      if (activeCallsMap[userId] || activeCallsMap[to]) {
        socket.emit("call-error", { 
          error: "User is already in a call",
          code: "USER_BUSY"
        });
        return;
      }

      // Track the call
      activeCallsMap[userId] = { caller: userId, callee: to, status: "offering" };
      activeCallsMap[to] = { caller: userId, callee: to, status: "receiving" };

      console.log(`Video offer from ${userId} to ${to}`);
      
      io.to(receiverSocketId).emit("video-offer", {
        from: userId,
        offer,
        timestamp: Date.now()
      });
      
      // Set a timeout for the offer (30 seconds)
      setTimeout(() => {
        if (activeCallsMap[userId]?.status === "offering") {
          // Offer timed out
          socket.emit("call-timeout", { to });
          
          const receiverSocketId = getReciverId(to);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("call-timeout", { from: userId });
          }
          
          // Clean up
          delete activeCallsMap[userId];
          delete activeCallsMap[to];
        }
      }, 30000);
      
    } catch (error) {
      console.error("Error handling video-offer:", error);
      socket.emit("call-error", { 
        error: "Failed to send offer",
        code: "OFFER_FAILED"
      });
    }
  });

  // Video answer with enhanced error handling
  socket.on("video-answer", ({ to, answer }) => {
    try {
      const receiverSocketId = getReciverId(to);
      
      if (!receiverSocketId) {
        socket.emit("call-error", { 
          error: "Caller not found or offline",
          code: "CALLER_NOT_FOUND"
        });
        return;
      }

      // Update call status
      if (activeCallsMap[userId]) {
        activeCallsMap[userId].status = "connected";
      }
      if (activeCallsMap[to]) {
        activeCallsMap[to].status = "connected";
      }

      console.log(`Video answer from ${userId} to ${to}`);
      
      io.to(receiverSocketId).emit("video-answer", {
        from: userId,
        answer,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error("Error handling video-answer:", error);
      socket.emit("call-error", { 
        error: "Failed to send answer",
        code: "ANSWER_FAILED"
      });
    }
  });

  // ICE candidate with enhanced error handling and validation
  socket.on("ice-candidate", ({ to, candidate }) => {
    try {
      const receiverSocketId = getReciverId(to);
      
      if (!receiverSocketId) {
        console.warn(`ICE candidate: Receiver ${to} not found`);
        return;
      }

      // Validate candidate object
      if (!candidate || typeof candidate !== 'object') {
        console.warn("Invalid ICE candidate received");
        return;
      }

      console.log(`ICE candidate from ${userId} to ${to}, type: ${candidate.type || 'unknown'}`);
      
      io.to(receiverSocketId).emit("ice-candidate", {
        from: userId,
        candidate,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error("Error handling ice-candidate:", error);
    }
  });

  // Call rejected with cleanup
  socket.on("call-rejected", ({ to }) => {
    try {
      const receiverSocketId = getReciverId(to);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("call-rejected", {
          from: userId,
          timestamp: Date.now()
        });
      }

      // Clean up active calls
      delete activeCallsMap[userId];
      delete activeCallsMap[to];
      
      console.log(`Call rejected: ${userId} rejected call from ${to}`);
      
    } catch (error) {
      console.error("Error handling call-rejected:", error);
    }
  });

  // Call ended with cleanup
  socket.on("call-ended", ({ to }) => {
    try {
      const receiverSocketId = getReciverId(to);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("call-ended", {
          from: userId,
          timestamp: Date.now()
        });
      }

      // Clean up active calls
      delete activeCallsMap[userId];
      delete activeCallsMap[to];
      
      console.log(`Call ended: ${userId} ended call with ${to}`);
      
    } catch (error) {
      console.error("Error handling call-ended:", error);
    }
  });

  // New event: Get call status
  socket.on("get-call-status", ({ userId: targetUserId }) => {
    const isInCall = !!activeCallsMap[targetUserId];
    socket.emit("call-status", { 
      userId: targetUserId, 
      inCall: isInCall,
      callInfo: activeCallsMap[targetUserId] || null
    });
  });

  // New event: Force end call (for admin or error recovery)
  socket.on("force-end-call", ({ userId: targetUserId }) => {
    if (activeCallsMap[targetUserId]) {
      const callInfo = activeCallsMap[targetUserId];
      const otherUserId = callInfo.caller === targetUserId ? callInfo.callee : callInfo.caller;
      const otherUserSocketId = getReciverId(otherUserId);
      
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("call-ended", {
          from: userId,
          reason: "force_ended"
        });
      }
      
      delete activeCallsMap[targetUserId];
      delete activeCallsMap[otherUserId];
      
      console.log(`Force ended call for user ${targetUserId}`);
    }
  });

  // Heartbeat for WebRTC connection monitoring
  socket.on("webrtc-heartbeat", ({ to, status }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc-heartbeat", {
        from: userId,
        status,
        timestamp: Date.now()
      });
    }
  });

  // Error handling for malformed requests
  socket.on("error", (error) => {
    console.error(`Socket error for user ${userId}:`, error);
  });

  // Handle ping/pong for connection monitoring
  socket.on("ping", (data) => {
    socket.emit("pong", { ...data, serverTime: Date.now() });
  });
});

// Periodic cleanup of stale calls (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const staleCallTimeout = 5 * 60 * 1000; // 5 minutes
  
  Object.keys(activeCallsMap).forEach(userId => {
    const call = activeCallsMap[userId];
    if (call && call.timestamp && (now - call.timestamp) > staleCallTimeout) {
      console.log(`Cleaning up stale call for user ${userId}`);
      delete activeCallsMap[userId];
    }
  });
}, 5 * 60 * 1000);

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  
  // Notify all users about server shutdown
  io.emit("server-shutdown", { message: "Server is shutting down" });
  
  // Close all active calls
  Object.keys(activeCallsMap).forEach(userId => {
    const call = activeCallsMap[userId];
    if (call) {
      const otherUserId = call.caller === userId ? call.callee : call.caller;
      const otherUserSocketId = getReciverId(otherUserId);
      
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("call-ended", {
          from: userId,
          reason: "server_shutdown"
        });
      }
    }
  });
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

export { app, server, io };