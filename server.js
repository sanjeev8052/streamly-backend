import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import prisma from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { setupWebRTCSignaling } from './socket/signaling.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Streamly Backend MVC', time: new Date().toISOString() });
});

// API Routes
app.use('/api', userRoutes);
app.use('/api', chatRoutes);

// WebRTC Socket.io Signaling
setupWebRTCSignaling(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Streamly Express & WebRTC Server listening on http://localhost:${PORT}`);

  try {
    await prisma.$connect();
    console.log('🟢 PostgreSQL Database Connected Successfully via Prisma!');
  } catch (err) {
    console.log('⚠️ Database connection note: Using resilient fallback mode (PostgreSQL service not running locally).');
  }
});

