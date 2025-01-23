// db/userQueries.js
const db = require('./db');

async function getUsers() {
    const [rows] = await db.query('SELECT * FROM user_account');
    return rows;
}

module.exports = { getUsers };