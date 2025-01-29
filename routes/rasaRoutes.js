const express = require('express');
const { startRasa, stopRasa, restartRasa, getRasaProcess } = require('../rasa_scripts/rasaController');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const router = express.Router();

// Define the log directory paths
const logDirectory = process.env.LOG_DIR || path.join(__dirname, '../logs');
const logDirectoryToday = process.env.LOG_TODAY_DIR || path.join(__dirname, '../Rasa-Framework/Rasa/log');
const rasaUrl = process.env.RASA_URL || 'http://localhost:5005';

// Route to send messages to Rasa
router.post('/message', async (req, res) => {
    try {
        const { sender, message } = req.body;

        if (!sender || !message) {
            return res.status(400).send('Missing sender or message.');
        }

        const rasaResponse = await axios.post(`${rasaUrl}/webhooks/rest/webhook`, {
            sender,
            message,
        });

        // Check if the response includes actions
        if (rasaResponse.data && rasaResponse.data.length > 0) {
            const actions = rasaResponse.data.filter(msg => msg.custom_data); // Example check for action response
            if (actions.length > 0) {
                // Handle custom actions here, if needed
                actions.forEach(action => {
                    // Implement your custom action logic here (e.g., store data, trigger external API, etc.)
                });
            }
        }

        res.json(rasaResponse.data);
    } catch (error) {
        console.error('Error sending message to Rasa:', error);
        res.status(500).send('Error communicating with Rasa server');
    }
});

// Route to start Rasa
router.post('/start', async (req, res) => {
    try {
        await startRasa();
        res.json({ message: "Rasa server started successfully." });
    } catch (error) {
        console.error('Error starting Rasa server:', error.message);
        res.status(500).json({ message: `Error starting Rasa server: ${error.message}` });
    }
});

// Route to stop Rasa
router.post('/stop', async (req, res) => {
    try {
        await stopRasa();
        res.json({ message: "Rasa server stopped successfully." });
    } catch (error) {
        console.error('Error stopping Rasa server:', error.message);
        res.status(500).json({ message: `Error stopping Rasa server: ${error.message}` });
    }
});

// Route to restart Rasa
router.post('/restart', async (req, res) => {
    try {
        await restartRasa();
        res.json({ message: "Rasa server restarted successfully." });
    } catch (error) {
        console.error('Error restarting Rasa server:', error.message);
        res.status(500).json({ message: `Error restarting Rasa server: ${error.message}` });
    }
});

// Route for fetching today's Rasa logs
router.get('/logs/today', (req, res) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentLogPathToday = path.join(logDirectoryToday, `log_${year}-${month}-${day}.txt`);

    fs.readFile(currentLogPathToday, 'utf8', (err, data) => {
        if (err) {
            console.error(`Log file not found: ${currentLogPathToday}. Error: ${err.message}`);
            return res.status(404).send(`No log file found for today at ${currentLogPathToday}.`);
        } else {
            return res.send(data);
        }
    });
});

// Route for fetching general Rasa logs
router.get('/logs/general', (req, res) => {
    const today = new Date();

    // Define the general log path
    const currentLogPath = path.join(logDirectory, `server-${today.toISOString().split('T')[0]}.log`);

    // Try reading the log from the general log directory
    fs.readFile(currentLogPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Log file from default directory not found:', err.message);
            return res.status(404).send('No general log file found for today.');
        } else {
            return res.send(data); // Send general log
        }
    });
});

// Route to get the status of Rasa
router.get('/status', async (req, res) => {
    const rasaProcess = getRasaProcess();
    if (rasaProcess) {
        try {
            const response = await axios.get(`${rasaUrl}/status`, { timeout: 5000 }); // 5-second timeout
            if (response.data && response.data.model_file) {
                return res.json({
                    running: true,
                    state: 'running',
                    model_file: response.data.model_file,
                    model_id: response.data.model_id || 'unknown',
                    num_active_training_jobs: response.data.num_active_training_jobs || 0,
                });
            } else {
                return res.json({
                    running: false,
                    state: 'stopped',
                    model_file: null,
                    model_id: null,
                    num_active_training_jobs: 0
                });
            }
        } catch (error) {
            console.error('Error checking Rasa status:', error.message);
            return res.json({
                running: false,
                state: 'stopped',
                model_file: null,
                model_id: null,
                num_active_training_jobs: 0,
                error: error.message || 'Unable to reach Rasa server.'
            });
        }
    } else {
        return res.json({
            running: false,
            state: 'stopped',
            model_file: null,
            model_id: null,
            num_active_training_jobs: 0,
            message: 'Rasa server is not running.'
        });
    }
});

module.exports = router;
