const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const pollRoutes = require('./routes/pollRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const electionRoutes = require('./routes/electionRoutes');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    credentials: true
  }
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join_poll', (pollId) => {
    socket.join(`poll_${pollId}`);
    console.log(`Socket ${socket.id} joined poll_${pollId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Middleware
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"], // Added 5173 for Vite default
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/election', electionRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('POLLX API is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const SERVER_PORT = process.env.PORT || 5000;

server.listen(SERVER_PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${SERVER_PORT}`);
  console.log(`Accepting requests from: ${process.env.FRONTEND_URL}, http://localhost:3000, http://localhost:5173`);
});
