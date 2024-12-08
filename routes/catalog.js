const express = require('express');
const multer = require('multer');
const db = require('../models/db');
const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Create a new catalog item
router.post('/create', upload.single('image'), (req, res) => {
  const { name, description, cost, currencyType } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !description || !cost || !currencyType || !imageUrl) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const query = 'INSERT INTO items (name, description, cost, currency_type, image_url) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [name, description, cost, currencyType, imageUrl], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Failed to create item.' });
    }
    res.status(201).json({ message: 'Item created successfully.' });
  });
});

// Get all catalog items
router.get('/items', (req, res) => {
  db.query('SELECT * FROM items', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error.' });
    }
    res.json(results);
  });
});

// Get all catalog items with ownership status
router.get('/items/user/:userId', (req, res) => {
    const { userId } = req.params;
  
    const query = `
      SELECT 
        items.*, 
        CASE 
          WHEN owned_items.item_id IS NOT NULL THEN true 
          ELSE false 
        END AS owned
      FROM items
      LEFT JOIN owned_items ON items.id = owned_items.item_id AND owned_items.user_id = ?
    `;
  
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error.' });
      }
      res.json(results);
    });
  });

  router.get('/items/:itemId', (req, res) => {
    const { itemId } = req.params;
    db.query('SELECT * FROM items WHERE id = ?', [itemId], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json(results[0]); // Ensure it returns a single item object
    });
  });
  
  

// Buy Item Route
router.post('/buy', (req, res) => {
  console.log('Received payload:', req.body);

  const { itemId, userId } = req.body;

  if (!itemId || !userId) {
    return res.status(400).json({ message: 'Invalid request. User ID and Item ID are required.' });
  }

  db.query('SELECT * FROM items WHERE id = ?', [itemId], (err, itemResults) => {
    if (err || itemResults.length === 0) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const item = itemResults[0];

    db.query('SELECT gold, tickets FROM users WHERE id = ?', [userId], (err, userResults) => {
      if (err || userResults.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const user = userResults[0];
      const currencyField = item.currency_type === 'gold' ? 'gold' : 'tickets';
      const cost = item.cost;

      if (user[currencyField] < cost) {
        return res.status(400).json({ message: `Not enough ${item.currency_type}.` });
      }

      // Deduct cost and update user's currency
      db.query(
        `UPDATE users SET ${currencyField} = ${currencyField} - ? WHERE id = ?`,
        [cost, userId],
        (err) => {
          if (err) {
            console.error('Error updating user currency:', err);
            return res.status(500).json({ message: 'Purchase failed.' });
          }

          // Insert into owned_items table
          db.query(
            'INSERT INTO owned_items (user_id, item_id) VALUES (?, ?)',
            [userId, itemId],
            (err) => {
              if (err) {
                console.error('Insert into owned_items error:', err);
                return res.status(500).json({ message: 'Failed to add item to inventory.' });
              }

              res.json({ message: 'Item purchased successfully.' });
            }
          );
        }
      );
    });
  });
});

// Get Owned Items for a User with Equipped Status
router.get('/owned/:userId', (req, res) => {
    const { userId } = req.params;
  
    db.query(
      `SELECT owned_items.item_id, items.name, items.image_url, owned_items.equipped 
       FROM owned_items 
       INNER JOIN items ON owned_items.item_id = items.id 
       WHERE owned_items.user_id = ?`,
      [userId],
      (err, results) => {
        if (err) {
          console.error('Error fetching owned items:', err);
          return res.status(500).json({ message: 'Failed to fetch owned items.' });
        }
        res.json(results);
      }
    );
  });
  
  
  
  // Get Equipped Items for a User
// Get Equipped Items for a User
router.get('/equipped/:userId', (req, res) => {
    const { userId } = req.params;
  
    db.query(
      'SELECT owned_items.item_id, items.name, items.image_url FROM owned_items INNER JOIN items ON owned_items.item_id = items.id WHERE owned_items.user_id = ? AND owned_items.equipped = 1',
      [userId],
      (err, results) => {
        if (err) {
          console.error('Error fetching equipped items:', err);
          return res.status(500).json({ message: 'Failed to fetch equipped items.' });
        }
        res.json(results);
      }
    );
  });
  
  

// Equip Item Route
router.post('/equip', (req, res) => {
    const { userId, itemId } = req.body;
  
    if (!userId || !itemId) {
      return res.status(400).json({ message: 'User ID and Item ID are required.' });
    }
  
    // Equip the selected item
    db.query('UPDATE owned_items SET equipped = 1 WHERE user_id = ? AND item_id = ?', [userId, itemId], (err) => {
      if (err) {
        console.error('Error equipping item:', err);
        return res.status(500).json({ message: 'Failed to equip item.' });
      }
      res.json({ message: 'Item equipped successfully!' });
    });
  });
  
  
  
// Unequip Item Route
router.post('/unequip', (req, res) => {
  const { userId, itemId } = req.body;

  if (!userId || !itemId) {
    return res.status(400).json({ message: 'User ID and Item ID are required.' });
  }

  db.query('UPDATE owned_items SET equipped = 0 WHERE user_id = ? AND item_id = ?', [userId, itemId], (err) => {
    if (err) {
      console.error('Error unequipping item:', err);
      return res.status(500).json({ message: 'Failed to unequip item.' });
    }
    res.json({ message: 'Item unequipped successfully.' });
  });
});
  
  
  

module.exports = router;
