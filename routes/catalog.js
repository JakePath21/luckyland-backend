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

// Buy Items
router.post('/buy', (req, res) => {
    const { itemId } = req.body;
    // Placeholder logic for buying an item
    res.json({ message: `Item with ID ${itemId} purchased successfully!` });
});

module.exports = router;
