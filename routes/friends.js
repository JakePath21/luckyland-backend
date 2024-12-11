const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Send a Friend Request
router.post('/request', (req, res) => {
    const { senderId, receiverId } = req.body;
    db.query('INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)', [senderId, receiverId], (err) => {
        if (err) return res.status(500).json({ message: 'Error sending friend request' });
        res.json({ message: 'Friend request sent!' });
    });
});

// Get Friends List
router.get('/:userId/friends', (req, res) => {
    const { userId } = req.params;
    db.query(
        'SELECT users.id, users.username FROM friends JOIN users ON friends.friend_id = users.id WHERE friends.user_id = ?',
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error fetching friends list' });
            res.json(results);
        }
    );
});

// Get Pending Friend Requests
router.get('/:userId/requests', (req, res) => {
    const { userId } = req.params;
    db.query(
        'SELECT friend_requests.id, users.username, users.id as sender_id FROM friend_requests JOIN users ON friend_requests.sender_id = users.id WHERE friend_requests.receiver_id = ?',
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error fetching friend requests' });
            res.json(results);
        }
    );
});

// Accept Friend Request
router.post('/accept', (req, res) => {
    const { requestId, senderId, receiverId } = req.body;
    db.query('DELETE FROM friend_requests WHERE id = ?', [requestId], (err) => {
        if (err) return res.status(500).json({ message: 'Error accepting friend request' });
        db.query('INSERT INTO friends (user_id, friend_id) VALUES (?, ?), (?, ?)', [senderId, receiverId, receiverId, senderId], (err) => {
            if (err) return res.status(500).json({ message: 'Error adding friend' });
            res.json({ message: 'Friend request accepted!' });
        });
    });
});

// Decline Friend Request
router.post('/decline', (req, res) => {
    const { requestId } = req.body;
    db.query('DELETE FROM friend_requests WHERE id = ?', [requestId], (err) => {
        if (err) return res.status(500).json({ message: 'Error declining friend request' });
        res.json({ message: 'Friend request declined' });
    });
});

module.exports = router;
