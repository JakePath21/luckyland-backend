const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http'); // Import the http module
const { Server } = require('socket.io'); // Import the Socket.IO server
const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const friendsRoutes = require('./routes/friends');
const usersRoutes = require('./routes/users');
const db = require('./models/db'); // If you have a database connection file

dotenv.config();

// Initialize the app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/friends', friendsRoutes);
app.use('/api/users', usersRoutes);

// Create an HTTP server to work with Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Frontend URL
    methods: ['GET', 'POST']
  }
});

// WebSocket Event Handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle balance fetch event
  socket.on('fetchBalance', async (username) => {
    try {
      db.query('SELECT gold, tickets FROM users WHERE username = ?', [username], (err, results) => {
        if (err || results.length === 0) {
          console.error('Balance fetch error:', err || 'User not found');
          return;
        }

        const { gold, tickets } = results[0];
        socket.emit('balanceUpdate', { gold, tickets });
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
