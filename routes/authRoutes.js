const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateJWT, revokeToken } = require('../middlewares/authenticateJWT');
const db = require('../db/db');
const router = express.Router();
require('dotenv').config(); // Pastikan .env dibaca

const refreshTokens = new Set();

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('Login attempt for username:', username);

    try {
        const [users] = await db.query('SELECT * FROM user_account WHERE username = ?', [username]);
        const user = users && users.length > 0 ? users[0] : null;

        if (!user) {
            console.log(`Username ${username} not found`);
            return res.status(401).json({ error: 'Username not found' });
        }

        if (await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({ no_user: user.no_user, username: user.username }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRATION,
            });
            const refreshToken = jwt.sign({ no_user: user.no_user, username: user.username }, process.env.REFRESH_TOKEN_SECRET, {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRATION,
            });

            refreshTokens.add(refreshToken); // Save refresh token
            console.log(`User ${username} logged in successfully`);

            res.json({
                accessToken,
                refreshToken,
                user: {
                    no_user: user.no_user,
                    username: user.username,
                    profil_url: `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/profil_img/${user.profil_url}`,
                },
            });
        } else {
            console.log(`Invalid password attempt for user ${username}`);
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh token
router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;

    console.log('Refresh token received:', refreshToken);

    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        console.log('Invalid or missing refresh token');
        return res.status(403).json({ error: 'Refresh token is invalid or missing' });
    }

    try {
        const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log(`Refresh token verified for user ${user.username}`);

        const newAccessToken = jwt.sign({ no_user: user.no_user, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRATION,
        });

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        console.error('Error verifying refresh token:', err);
        res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const { refreshToken } = req.body;

    if (token) revokeToken(token); // Revokes the access token
    if (refreshToken) refreshTokens.delete(refreshToken); // Removes refresh token from set

    console.log('User logged out successfully');
    res.json({ message: 'Successfully logged out' });
});

// Protected route
router.get('/protected', authenticateJWT, (req, res) => {
    console.log(`Access to protected route by user ${req.user.username}`);
    res.json({ message: 'This is a protected route!', user: req.user });
});

module.exports = router;
