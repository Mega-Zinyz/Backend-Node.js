const app = require('./app');
const { logger } = require('./middlewares/logger');  // Import logger

const PORT = process.env.PORT || 5000;

// Jalankan server hanya jika tidak dalam mode testing
if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);  // Menambahkan log server start
    });

    module.exports = server; // Export server untuk testing
} else {
    module.exports = app;
}
