// logger.js
const { createLogger, transports, format } = require('winston');
const db = require('./db/db');  // Import pool koneksi database yang sudah ada

// Fungsi untuk menulis log ke MySQL
const logToMySQL = async (level, message) => {
    try {
        const connection = await db.getConnection();  // Ambil koneksi dari pool
        const query = 'INSERT INTO node_logs (log_level, message) VALUES (?, ?)';
        await connection.execute(query, [level, message]);  // Menyimpan log ke MySQL
        connection.release();  // Kembalikan koneksi ke pool
    } catch (error) {
        console.error('Error saving log to MySQL:', error.message);
    }
};

// Custom transport untuk Winston (menyimpan log ke MySQL)
class MySQLTransport extends transports.Stream {
    constructor(opts) {
        super(opts);
    }

    log(info, callback) {
        setImmediate(() => this.emit('logged', info));

        // Menyimpan log ke MySQL
        logToMySQL(info.level, info.message);

        callback();
    }
}

// Setup Logger
const logger = createLogger({
    level: 'info', // Default log level
    format: format.combine(
        format.timestamp(),
        format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
    ),
    transports: [
        new MySQLTransport(),  // Custom transport ke MySQL
        new transports.Console(), // Log ke console untuk pengembangan
    ],
});

module.exports = { logger };
