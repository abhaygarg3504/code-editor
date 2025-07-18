// server.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);

const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:3000", "https://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, "http://localhost:3000", "https://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true // Allow Engine.IO v3 clients
});

// Store room information
interface Room {
  sessionId: string;
  users: Map<string, { id: string; name: string; socketId: string }>;
  code: string;
  createdAt: Date;
}

const rooms = new Map<string, Room>();

// Helper function to generate room ID
const generateRoomId = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Helper function to get user list for a room
const getUserList = (room: Room): string[] => {
  return Array.from(room.users.values()).map(user => user.name);
};

// Helper function to clean up empty rooms
const cleanupRoom = (sessionId: string) => {
  const room = rooms.get(sessionId);
  if (room && room.users.size === 0) {
    console.log(`🧹 Cleaning up empty room: ${sessionId}`);
    rooms.delete(sessionId);
  }
};

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  let currentRoomId: string | null = null;
  let userId: string | null = null;

  // Handle room creation
  socket.on('create-room', ({ userId: userIdParam, name }) => {
    try {
      const sessionId = generateRoomId();
      userId = userIdParam;
      
      console.log(`📝 Creating room ${sessionId} for user ${name} (${userId})`);
      
      // Create new room
      const room: Room = {
        sessionId,
        users: new Map(),
        code: '',
        createdAt: new Date()
      };
      
      // Add user to room
      if (typeof userId === 'string') {
        room.users.set(userId, {
          id: userId,
          name,
          socketId: socket.id
        });
      } else {
        socket.emit('error', { message: 'Invalid userId' });
        return;
      }
      
      rooms.set(sessionId, room);
      currentRoomId = sessionId;
      
      // Join socket room
      socket.join(sessionId);
      
      // Send room created event
      socket.emit('room-created', { sessionId });
      
      // Send initial code and user list
      socket.emit('init', { code: room.code });
      io.to(sessionId).emit('user-list', getUserList(room));
      
      console.log(`✅ Room ${sessionId} created successfully`);
    } catch (error) {
      console.error('❌ Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // Handle joining existing room
  socket.on('join-room', ({ sessionId, userId: userIdParam, name }) => {
    try {
      userId = userIdParam;
      console.log(`🚪 User ${name} (${userId}) attempting to join room ${sessionId}`);
      
      // Check if room exists
      let room = rooms.get(sessionId);
      
      if (!room) {
        // Create room if it doesn't exist
        console.log(`📝 Room ${sessionId} doesn't exist, creating it`);
        room = {
          sessionId,
          users: new Map(),
          code: '',
          createdAt: new Date()
        };
        rooms.set(sessionId, room);
      }
      
      // Check room capacity (max 10 users)
      if (room.users.size >= 10) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      
      // Leave current room if in one
      if (currentRoomId && currentRoomId !== sessionId) {
        socket.leave(currentRoomId);
        const oldRoom = rooms.get(currentRoomId);
        if (oldRoom && userId) {
          oldRoom.users.delete(userId);
          io.to(currentRoomId).emit('user-list', getUserList(oldRoom));
          cleanupRoom(currentRoomId);
        }
      }
      
      // Add user to room
      if (typeof userId === 'string') {
        room.users.set(userId, {
          id: userId,
          name,
          socketId: socket.id
        });
      } else {
        socket.emit('error', { message: 'Invalid userId' });
        return;
      }
      
      currentRoomId = sessionId;
      
      // Join socket room
      socket.join(sessionId);
      
      // Send current code to new user
      socket.emit('init', { code: room.code });
      
      // Update user list for everyone in the room
      io.to(sessionId).emit('user-list', getUserList(room));
      
      console.log(`✅ User ${name} joined room ${sessionId}. Room now has ${room.users.size} users`);
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle code changes
  socket.on('code-change', ({ sessionId, code }) => {
    try {
      const room = rooms.get(sessionId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Update room code
      room.code = code;
      
      // Broadcast code change to all other users in the room
      socket.to(sessionId).emit('code-update', code);
      
      // Optional: Add debouncing for frequent updates
      // console.log(`🔄 Code updated in room ${sessionId}, length: ${code.length}`);
    } catch (error) {
      console.error('❌ Error handling code change:', error);
      socket.emit('error', { message: 'Failed to update code' });
    }
  });

  // Handle leaving room
  socket.on('leave-room', () => {
    try {
      if (currentRoomId && userId) {
        console.log(`👋 User ${userId} leaving room ${currentRoomId}`);
        
        const room = rooms.get(currentRoomId);
        if (room) {
          // Remove user from room
          room.users.delete(userId);
          
          // Leave socket room
          socket.leave(currentRoomId);
          
          // Update user list for remaining users
          io.to(currentRoomId).emit('user-list', getUserList(room));
          
          // Clean up empty room
          cleanupRoom(currentRoomId);
        }
        
        currentRoomId = null;
        userId = null;
      }
    } catch (error) {
      console.error('❌ Error leaving room:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.id}, reason: ${reason}`);
    
    try {
      if (currentRoomId && userId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          // Remove user from room
          room.users.delete(userId);
          
          // Update user list for remaining users
          io.to(currentRoomId).emit('user-list', getUserList(room));
          
          // Clean up empty room
          cleanupRoom(currentRoomId);
          
          console.log(`🧹 Cleaned up user ${userId} from room ${currentRoomId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error during disconnect cleanup:', error);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${socket.id}:`, error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    connections: io.engine.clientsCount
  });
});

// Get room info endpoint
app.get('/rooms/:sessionId', (req, res) : any => {
  const { sessionId } = req.params;
  const room = rooms.get(sessionId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    sessionId: room.sessionId,
    userCount: room.users.size,
    users: getUserList(room),
    createdAt: room.createdAt,
    codeLength: room.code.length
  });
});

// Add a test endpoint to verify server is running
app.get('/', (req, res) => {
  res.json({ 
    message: 'Socket.IO server is running',
    timestamp: new Date().toISOString(),
    rooms: rooms.size
  });
});

const PORT = process.env.SOCKET_PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
  console.log(`📡 Server URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Periodic cleanup of old rooms (optional)
setInterval(() => {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [sessionId, room] of rooms.entries()) {
    // Remove rooms older than 24 hours with no users
    const hoursOld = (now.getTime() - room.createdAt.getTime()) / (1000 * 60 * 60);
    if (room.users.size === 0 && hoursOld > 24) {
      rooms.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old empty rooms`);
  }
}, 60 * 60 * 1000); // Run every hour

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});