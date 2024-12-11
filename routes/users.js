const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Get User Profile by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      id, 
      username, 
      rank, 
      avatar, 
      registered_at, 
      bets_placed, 
      total_won, 
      favorite_game, 
      gold_wagered 
    FROM users 
    WHERE id = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error while fetching user profile.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(results[0]);
  });
});

// Get All Users with Pagination and Search
router.get('/', (req, res) => {
  const { search = '', page = 1 } = req.query;
  const limit = 8;
  const offset = (page - 1) * limit;

  // SQL query for fetching users with optional search
  const query = `
    SELECT 
      id, 
      username, 
      avatar, 
      registered_at 
    FROM users 
    WHERE username LIKE ?
    ORDER BY registered_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) AS total FROM users WHERE username LIKE ?
  `;

  db.query(countQuery, [`%${search}%`], (err, countResults) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error while counting users.' });
    }

    const totalUsers = countResults[0].total;
    const hasMorePages = totalUsers > offset + limit;

    db.query(query, [`%${search}%`, limit, offset], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error while fetching users.' });
      }

      res.json({
        users: results,
        hasMorePages,
      });
    });
  });
});

module.exports = router;
