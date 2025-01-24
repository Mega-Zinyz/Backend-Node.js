const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../db/db'); // Adjust path to your database configuration

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../assets/profil_img')); // Directory for profile images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
    }
});
const upload = multer({ storage });

// Get all user accounts
router.get('/accounts', async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM user_account');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to load users.' });
    }
});

// Get user profile by no_user
router.get('/accounts/:no_user', async (req, res) => {
    const no_user = req.params.no_user;

    try {
        const [userRows] = await db.query('SELECT * FROM user_account WHERE no_user = ?', [no_user]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json(userRows[0]); // Send back the user data
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user details.' });
    }
});

// Register a new user
router.post('/register', upload.single('profil_url'), async (req, res) => {
    const { username, password } = req.body;
    const profil_url = req.file ? req.file.filename : null;

    try {
        // Check if the username already exists
        const [existingUserRows] = await db.query('SELECT * FROM user_account WHERE username = ?', [username]);
        if (existingUserRows.length > 0) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert the new user into the database
        await db.query('INSERT INTO user_account (username, password, profil_url) VALUES (?, ?, ?)', [username, hashedPassword, profil_url]);

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user.' });
    }
});

// Update user profile
router.put('/accounts/:no_user', upload.single('profil_url'), async (req, res) => {
    const no_user = req.params.no_user;
    const { username, password } = req.body;
    const profil_url = req.file ? req.file.filename : null;

    try {
        // First, retrieve the existing user to get the old profil_url
        const [userRows] = await db.query('SELECT profil_url FROM user_account WHERE no_user = ?', [no_user]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const oldProfilUrl = userRows[0].profil_url;

        // Prepare query to update user details
        let query = 'UPDATE user_account SET username = ?';
        const params = [username];

        // Only update the password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        // Only update the profile URL if a new file is uploaded
        if (profil_url) {
            query += ', profil_url = ?';
            params.push(profil_url);
        }

        query += ' WHERE no_user = ?';
        params.push(no_user);

        // Execute the update query
        const [results] = await db.query(query, params);
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Delete the old profile image if it exists
        if (oldProfilUrl) {
            const filePath = path.join(__dirname, '../assets/profil_img', oldProfilUrl);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting old profile image:', err);
                } else {
                    console.log('Old profile image deleted successfully');
                }
            });
        }

        res.status(200).json({ message: 'User updated successfully!' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

// Delete user account
router.delete('/accounts/:no_user', async (req, res) => {
    const no_user = req.params.no_user;
    
    try {
        // Step 1: Get the existing user data
        const [existingUserRows] = await db.query('SELECT * FROM user_account WHERE no_user = ?', [no_user]);
        if (existingUserRows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const existingUser = existingUserRows[0];
        const oldProfilUrl = existingUser.profil_url; // Store old profile URL for deletion

        // Step 2: Delete user from database
        await db.query('DELETE FROM user_account WHERE no_user = ?', [no_user]);

        // Step 3: Delete the old image file
        const oldImagePath = path.join(__dirname, '../assets/profil_img', oldProfilUrl); // Adjust path as necessary
        fs.unlink(oldImagePath, (err) => {
            if (err) {
                console.error('Error deleting old image:', err);
            } else {
                console.log('Old image deleted successfully.');
            }
        });

        res.status(200).json({ message: 'User deleted successfully!' });  // Success response
    } catch (error) {
        console.error('Error deleting user:', error.message);  // Log any other errors
        res.status(500).json({ error: 'Failed to delete user. Please try again.' });  // General error response
    }
});

module.exports = router;
