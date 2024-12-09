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
  const { name, description, cost, currencyType, itemType } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !description || !cost || !currencyType || !imageUrl || !itemType) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const query = 'INSERT INTO items (name, description, cost, currency_type, image_url, item_type) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [name, description, cost, currencyType, imageUrl, itemType], (err) => {
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
  
  // Update an item
router.put('/update/:itemId', (req, res) => {
    const { itemId } = req.params;
    const { name, description, cost, currencyType, itemType } = req.body;
  
    const query = `
      UPDATE items
      SET name = ?, description = ?, cost = ?, currency_type = ?, item_type = ?
      WHERE id = ?
    `;
  
    db.query(query, [name, description, cost, currency_type, itemId], (err) => {
      if (err) {
        console.error('Error updating item:', err);
        return res.status(500).json({ message: 'Failed to update item.' });
      }
      res.json({ message: 'Item updated successfully.' });
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
    `SELECT owned_items.item_id, items.name, items.image_url, items.item_type, owned_items.equipped 
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

  
  router.put('/edit/:itemId', (req, res) => {
    const { itemId } = req.params;
    const { name, description, cost, currencyType, itemType } = req.body;
  
    if (!name || !description || !cost || !currencyType || !itemType) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
  
    const query = `
      UPDATE items
      SET name = ?, description = ?, cost = ?, currency_type = ?, item_type = ?
      WHERE id = ?
    `;
  
    db.query(query, [name, description, cost, currencyType, itemId], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Failed to update item.' });
      }
      res.json({ message: 'Item updated successfully.' });
    });
  });
  
  router.delete('/delete/:itemId', (req, res) => {
    const { itemId } = req.params;
  
    const deleteItemQuery = 'DELETE FROM items WHERE id = ?';
    const deleteOwnedItemsQuery = 'DELETE FROM owned_items WHERE item_id = ?';
  
    db.query(deleteOwnedItemsQuery, [itemId], (err) => {
      if (err) {
        console.error('Error deleting item from owned_items:', err);
        return res.status(500).json({ message: 'Failed to delete item from inventories.' });
      }
  
      db.query(deleteItemQuery, [itemId], (err) => {
        if (err) {
          console.error('Error deleting item:', err);
          return res.status(500).json({ message: 'Failed to delete item.' });
        }
  
        res.json({ message: 'Item deleted successfully.' });
      });
    });
  });
  
  
  // Get Equipped Items for a User
// Get Equipped Items for a User
// router.get('/equipped/:userId', (req, res) => {
//     const { userId } = req.params;
  
//     db.query(
//       'SELECT owned_items.item_id, items.name, items.image_url FROM owned_items INNER JOIN items ON owned_items.item_id = items.id WHERE owned_items.user_id = ? AND owned_items.equipped = 1',
//       [userId],
//       (err, results) => {
//         if (err) {
//           console.error('Error fetching equipped items:', err);
//           return res.status(500).json({ message: 'Failed to fetch equipped items.' });
//         }
//         res.json(results);
//       }
//     );
//   });
  
router.get('/equipped/:userId', (req, res) => {
  const { userId } = req.params;

  db.query(
    `
    SELECT 
      owned_items.item_id, 
      items.name, 
      items.image_url, 
      items.item_type
    FROM owned_items
    INNER JOIN items ON owned_items.item_id = items.id
    WHERE owned_items.user_id = ? AND owned_items.equipped = 1
    ORDER BY 
      CASE items.item_type
        WHEN 'back' THEN 1
        WHEN 'pants' THEN 2
        WHEN 'shirt' THEN 3
        WHEN 'hair' THEN 4
        WHEN 'hat' THEN 5
        WHEN 'front' THEN 6
        ELSE 7
      END
    `,
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

  

// // Equip Item Route
// router.post('/equip', (req, res) => {
//     const { userId, itemId } = req.body;
  
//     if (!userId || !itemId) {
//       return res.status(400).json({ message: 'User ID and Item ID are required.' });
//     }
  
//     // Equip the selected item
//     db.query('UPDATE owned_items SET equipped = 1 WHERE user_id = ? AND item_id = ?', [userId, itemId], (err) => {
//       if (err) {
//         console.error('Error equipping item:', err);
//         return res.status(500).json({ message: 'Failed to equip item.' });
//       }
//       res.json({ message: 'Item equipped successfully!' });
//     });
//   });
  
// Equip Item Route with Item Type and Equip Limit Check
router.post('/equip', (req, res) => {
  const { userId, itemId } = req.body;

  if (!userId || !itemId) {
    return res.status(400).json({ message: 'User ID and Item ID are required.' });
  }

  // Step 1: Fetch the item type of the item being equipped
  db.query('SELECT item_type FROM items WHERE id = ?', [itemId], (err, results) => {
    if (err) {
      console.error('Error fetching item type:', err);
      return res.status(500).json({ message: 'Failed to fetch item type.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const itemType = results[0].item_type;

    // Step 2: Check how many items of that type are already equipped
    db.query(
      'SELECT COUNT(*) AS count FROM owned_items oi INNER JOIN items i ON oi.item_id = i.id WHERE oi.user_id = ? AND oi.equipped = 1 AND i.item_type = ?',
      [userId, itemType],
      (err, countResults) => {
        if (err) {
          console.error('Error checking equipped items:', err);
          return res.status(500).json({ message: 'Failed to check equipped items.' });
        }

        // Define equip limits per item type
        const equipLimits = {
          back: 1,
          front: 1,
          shirt: 1,
          pants: 1,
          package: 1,
          hat: 1,
          hair: 1,
        };

        const currentCount = countResults[0].count;

        if (currentCount >= equipLimits[itemType]) {
          return res.status(400).json({ message: `You can only equip ${equipLimits[itemType]} ${itemType} item(s) at a time.` });
        }

        // Step 3: Unequip all items of the same type before equipping the new item
        db.query(
          `UPDATE owned_items oi 
           INNER JOIN items i ON oi.item_id = i.id 
           SET oi.equipped = 0 
           WHERE oi.user_id = ? AND i.item_type = ?`,
          [userId, itemType],
          (err) => {
            if (err) {
              console.error('Error unequipping previous items:', err);
              return res.status(500).json({ message: 'Failed to unequip previous items.' });
            }

            // Step 4: Equip the new item
            db.query(
              'UPDATE owned_items SET equipped = 1 WHERE user_id = ? AND item_id = ?',
              [userId, itemId],
              (err) => {
                if (err) {
                  console.error('Error equipping item:', err);
                  return res.status(500).json({ message: 'Failed to equip item.' });
                }
                res.json({ message: 'Item equipped successfully!' });
              }
            );
          }
        );
      }
    );
  });
});

  
  
// Unequip Item Route
// router.post('/unequip', (req, res) => {
//   const { userId, itemId } = req.body;

//   if (!userId || !itemId) {
//     return res.status(400).json({ message: 'User ID and Item ID are required.' });
//   }

//   db.query('UPDATE owned_items SET equipped = 0 WHERE user_id = ? AND item_id = ?', [userId, itemId], (err) => {
//     if (err) {
//       console.error('Error unequipping item:', err);
//       return res.status(500).json({ message: 'Failed to unequip item.' });
//     }
//     res.json({ message: 'Item unequipped successfully.' });
//   });
// });
  
// Unequip Item Route
router.post('/unequip', (req, res) => {
  const { userId, itemId } = req.body;

  if (!userId || !itemId) {
    return res.status(400).json({ message: 'User ID and Item ID are required.' });
  }

  // Check if the item is currently equipped before unequipping
  db.query(
    'SELECT equipped FROM owned_items WHERE user_id = ? AND item_id = ?',
    [userId, itemId],
    (err, results) => {
      if (err) {
        console.error('Error checking item status:', err);
        return res.status(500).json({ message: 'Failed to check item status.' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Item not found in user inventory.' });
      }

      if (results[0].equipped === 0) {
        return res.status(400).json({ message: 'Item is not currently equipped.' });
      }

      // Proceed to unequip the item
      db.query(
        'UPDATE owned_items SET equipped = 0 WHERE user_id = ? AND item_id = ?',
        [userId, itemId],
        (err) => {
          if (err) {
            console.error('Error unequipping item:', err);
            return res.status(500).json({ message: 'Failed to unequip item.' });
          }
          res.json({ message: 'Item unequipped successfully.' });
        }
      );
    }
  );
});

  
  

module.exports = router;
