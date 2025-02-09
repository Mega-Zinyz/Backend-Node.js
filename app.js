const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
require('dotenv').config();

// Import route modules
const db = require('./db/db');
const rasaRoutes = require('./routes/rasaRoutes');
const roomsRoutes = require('./routes/roomsRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const intentsRoutes = require('./routes/intentsRoutes');
const rulesRoutes = require('./routes/rulesRoutes');
const dashboardRoutes = require('./routes/viewdashboardRouter');

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || 'https://frontend-angular-main.up.railway.app';

// Logging Setup
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });  // Ensure directories are created recursively
}

const transport = new winston.transports.DailyRotateFile({
    filename: 'server-%DATE%.log',
    dirname: logDirectory,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d'
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
    ),
    transports: [
        new winston.transports.Console(),  // Log to console for local development
        transport  // Log to rotated file
    ]
});

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
    res.send('Server is running');
});

// Error Handling
app.use((err, req, res, next) => {
    logger.error(`Error at ${req.method} ${req.url} - ${err.stack}`);
    res.status(500).send('Something went wrong!');
});

module.exports = app; // Just export the app, don't run the server here
