// db.js

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Example of connecting to the database
async function connectToDatabase() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to the database successfully');
        connection.release(); // Release the connection back to the pool
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}

// Call the connection function (optional, depending on your needs)
connectToDatabase();
module.exports = db; // Export the db pool for use in other modules
