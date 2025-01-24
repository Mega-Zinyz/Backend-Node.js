const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQLPORT
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
