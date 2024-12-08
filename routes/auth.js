const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const router = express.Router();

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Register Route
router.post('/register', async (req, res) => {
  const { username, password, gender } = req.body;
  const defaultAvatar = 'uploads/default-avatar.png'; // Path to default avatar

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, password, gender, avatar) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, gender, defaultAvatar],
      (err) => {
        if (err) {
          console.error('Registration error:', err);
          return res.status(500).json({ message: 'User already exists or database error' });
        }
        res.status(201).json({ message: 'User registered successfully' });
      }
    );
  } catch (err) {
    console.error('Registration server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.error('Login query error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];

    try {
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token with user's id and rank
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      // Send token and user id in response
      res.json({ token, id: user.id });
    } catch (err) {
      console.error('Password comparison error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });
});

// Get User Data Route
router.get('/user/:username', (req, res) => {
  const { username } = req.params;
  console.log('Requested username:', username); // Debug log

  db.query('SELECT gold, tickets FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    console.log('Database query results:', results);

    if (results.length === 0) {
      console.log('User not found:', username);
      return res.status(404).json({ message: 'User not found' });
    }

    const { gold, tickets } = results[0];
    res.json({ gold, tickets });
  });
});

// Get User Rank Route
router.get('/rank/:username', (req, res) => {
  const { username } = req.params;

  db.query('SELECT rank FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { rank } = results[0];
    res.json({ rank });
  });
});

module.exports = router;
