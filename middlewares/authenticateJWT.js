// middlewares/authenticateJWT.js
const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
        return res.sendStatus(403); // Forbidden if no token is provided
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden if token is invalid
        }
        req.user = user; // Save user info to request for use in next middleware/route
        next(); // Move to the next middleware/route handler
    });
}

module.exports = authenticateJWT;
