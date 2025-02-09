// server.js
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Jalankan server hanya jika tidak dalam mode testing
if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    module.exports = server; // Export server untuk testing
} else {
    module.exports = app;
}