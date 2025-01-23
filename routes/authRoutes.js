const express = require('express');
const jwt = require('jsonwebtoken');
const authenticateJWT = require('../middlewares/authenticateJWT'); // Adjusted path
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const router = express.Router();

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';

// Login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM user_account WHERE username = ?', [username]);
        const user = users[0];

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ no_user: user.no_user, username: user.username }, JWT_SECRET, {
                expiresIn: JWT_EXPIRATION,
            });

            // Construct profile URL dynamically
            res.json({
                token,
                user: {
                    no_user: user.no_user,
                    username: user.username,
                    profil_url: `http://localhost:3000/profil_img/${user.profil_url}`
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    // Optionally log the logout event or perform other actions
    res.json({ message: 'Successfully logged out' });
});

// Example protected route
router.get('/protected', authenticateJWT, (req, res) => {
    res.send('This is a protected route, accessible only with a valid token!');
});

module.exports = router;
