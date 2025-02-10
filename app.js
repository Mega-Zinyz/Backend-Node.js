// app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { logger } = require('./middlewares/logger');  // Import logger yang sudah dimodifikasi
const db = require('./db/db');
require('dotenv').config();

// Import route modules
const rasaRoutes = require('./routes/rasaRoutes');
const roomsRoutes = require('./routes/roomsRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const intentsRoutes = require('./routes/intentsRoutes');
const rulesRoutes = require('./routes/rulesRoutes');
const dashboardRoutes = require('./routes/viewdashboardRouter');

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || 'https://frontend-angular-main.up.railway.app';

// Middleware
app.use(cors({
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Files
app.use('/room_img', express.static(path.join(__dirname, 'assets', 'room_img')));
app.use('/profil_img', express.static(path.join(__dirname, 'assets', 'profil_img')));

// Routes
app.use('/api/rasa', rasaRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/intents', intentsRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check Route
app.get('/', (req, res) => {
    logger.info('Health check - Server is running');
    res.send('Server is running');
});

// Middleware untuk log request
app.use((req, res, next) => {
    logger.info(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    logger.error(`Error at ${req.method} ${req.url} - ${err.stack}`);
    res.status(500).send('Something went wrong!');
});

module.exports = app; // Hanya ekspor app, jangan jalankan server di sini
