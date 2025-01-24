const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateJWT, revokeToken } = require('../middlewares/authenticateJWT');
const db = require('../db/db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '7d';

const refreshTokens = new Set(); // Sementara (gunakan database untuk produksi)

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM user_account WHERE username = ?', [username]);
        const user = users[0];

        if (user && (await bcrypt.compare(password, user.password))) {
            const accessToken = jwt.sign({ no_user: user.no_user, username: user.username }, JWT_SECRET, {
                expiresIn: JWT_EXPIRATION,
            });
            const refreshToken = jwt.sign({ no_user: user.no_user, username: user.username }, REFRESH_TOKEN_SECRET, {
                expiresIn: REFRESH_TOKEN_EXPIRATION,
            });

            refreshTokens.add(refreshToken); // Simpan refresh token

            res.json({
                accessToken,
                refreshToken,
                user: {
                    no_user: user.no_user,
                    username: user.username,
                    profil_url: `${process.env.RAILWAY_PRIVATE_DOMAIN}:${process.env.MYSQLPORT}/profil_img/${user.profil_url}`,
                },
            });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh token
router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: 'Refresh token is invalid or missing' });
    }

    try {
        const user = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

        const newAccessToken = jwt.sign({ no_user: user.no_user, username: user.username }, JWT_SECRET, {
            expiresIn: JWT_EXPIRATION,
        });

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const { refreshToken } = req.body;

    if (token) revokeToken(token); // Tambahkan token ke blacklist
    if (refreshToken) refreshTokens.delete(refreshToken); // Hapus refresh token

    res.json({ message: 'Successfully logged out' });
});

// Protected route (contoh)
router.get('/protected', authenticateJWT, (req, res) => {
    res.json({ message: 'This is a protected route!', user: req.user });
});

module.exports = router;
