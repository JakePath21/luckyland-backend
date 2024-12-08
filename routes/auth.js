const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
    const { username, password, gender } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.query('INSERT INTO users (username, password, gender) VALUES (?, ?, ?)', [username, hashedPassword, gender], (err) => {
        if (err) return res.status(500).json({ message: 'User already exists' });
        res.status(201).json({ message: 'User registered successfully' });
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
// Login Route
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username }, 'your_secret_key', { expiresIn: '1h' });
        res.json({ token });
    });
});

module.exports = router;
