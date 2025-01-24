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

const environment = process.env.NODE_ENV || 'production';

const app = express();

// Variables
const PORT = process.env.PORT;
const CLIENT_URL = process.env.CLIENT_URL || 'https://frontend-angular-main.up.railway.app';
const ROOM_IMG_DIR = path.join(__dirname, 'assets', 'img', 'room_img');
const PROFILE_IMG_DIR = path.join(__dirname, 'assets', 'img', 'profil_img');

// Configure daily log rotation using winston
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
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
        new winston.transports.Console(),
        transport
    ]
});

// Middleware
app.use(cors({
    origin: CLIENT_URL, // Use CLIENT_URL for consistency
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));  // Allow larger JSON body size
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/room_img', express.static(ROOM_IMG_DIR));
app.use('/profil_img', express.static(PROFILE_IMG_DIR));

// Routes
app.use('/api/rasa', rasaRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/intents', intentsRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Test route for health check
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Error handling
app.use((err, req, res, next) => {
    logger.error(`Error at ${req.method} ${req.url} - ${err.stack}`);
    res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(PORT, () => {
    const pid = process.pid;
    console.log(`Server is running on http://localhost:${PORT} with PID: ${pid}`);
    logger.info(`Server started on http://localhost:${PORT} with PID: ${pid}`);
    logger.info(`Environment: ${environment}`);
});
