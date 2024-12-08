const express = require('express');
const db = require('../models/db');
const router = express.Router();

// Fetch Items
router.get('/items', (req, res) => {
    db.query('SELECT * FROM items', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error fetching items' });
        res.json(results);
    });
});

module.exports = router;
