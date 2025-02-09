const jwt = require('jsonwebtoken');
const blacklist = new Set(); // Blacklist sederhana (gunakan Redis untuk produksi)

function authenticateJWT(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is missing' });
    }

    const token = authHeader.split(' ')[1];

    if (!token || blacklist.has(token)) {
        return res.status(403).json({ error: 'Token is invalid or revoked' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token has expired. Please login again.' });
            }
            return res.status(403).json({ error: 'Invalid token.' });
        }

        req.user = user;
        next();
    });
}

// Tambahkan token ke blacklist
function revokeToken(token) {
    blacklist.add(token);
}

module.exports = { authenticateJWT, revokeToken };
