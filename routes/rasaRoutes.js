const express = require('express');
const { startRasa, stopRasa, restartRasa, getRasaProcess } = require('../rasa_scripts/rasaController');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const db = require('../db/db');

const router = express.Router();

require('dotenv').config();

// Route to send messages to Rasa
router.post('/message', async (req, res) => {
    try {
        const { sender, message } = req.body;

        if (!sender || !message) {
            return res.status(400).send('Missing sender or message.');
        }

        const rasaResponse = await axios.post(`${process.env.RASA_URL}/webhooks/rest/webhook`, {
            sender,
            message,
        }, {
            timeout: 10000 // Adjust timeout if necessary
        });

        res.json(rasaResponse.data);
    } catch (error) {
        console.error('Error sending message to Rasa:', error.code, error.message, error.stack); // Log more details
        if (error.code === 'ECONNRESET') {
            res.status(500).send('Connection to Rasa server was reset.');
        } else if (error.code === 'ECONNREFUSED') {
            res.status(500).send('Connection refused by Rasa server.');
        } else if (error.message.includes('timeout')) {
            res.status(500).send('Timeout occurred while connecting to Rasa server.');
        } else {
            res.status(500).send('Error communicating with Rasa server.');
        }
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

// Route for fetching today's Rasa logs from database
router.get('/logs/today', async (req, res) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    const query = 'SELECT * FROM node_logs WHERE DATE(timestamp) = ? ORDER BY timestamp DESC';

    try {
        const [results] = await db.query(query, [todayDate]);

        // If no logs found for today
        if (results.length === 0) {
            return res.status(404).send(`No logs found for today (${todayDate}).`);
        }

        // Send the results as JSON
        return res.json(results);
    } catch (err) {
        console.error(`Error fetching logs for today: ${err.message}`);
        return res.status(500).send(`Error fetching logs: ${err.message}`);
    }
});

// Route for fetching general Rasa logs from the database
router.get('/logs/general', async (req, res) => {
    try {
        const query = 'SELECT * FROM node_logs ORDER BY timestamp DESC LIMIT 100';  // Fetch the most recent 100 logs (you can adjust this as needed)
        const [results] = await db.query(query);  // Using the `db` pool from the connection

        // If no logs are found, return a 404
        if (results.length === 0) {
            return res.status(404).send('No general logs found.');
        }

        // Send the results as a JSON response
        return res.json(results);
    } catch (err) {
        console.error('Error fetching general logs:', err.message);
        return res.status(500).send(`Error fetching logs: ${err.message}`);
    }
});

// Route to get the status of Rasa
router.get('/status', async (req, res) => {
    const rasaProcess = getRasaProcess();
    if (rasaProcess) {
        try {
            const response = await axios.get(`${process.env.RASA_URL}/status`, { timeout: 5000 }); // 5-second timeout

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
            // ❌ Jangan pakai console.error untuk timeout biasa
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                return res.json({
                    running: false,
                    state: 'starting',
                    model_file: null,
                    model_id: null,
                    num_active_training_jobs: 0,
                    error: 'Rasa server is starting up...'
                });
            }

            // 🛑 Log error hanya jika benar-benar gagal (misal: koneksi mati)
            if (error.code !== 'ECONNREFUSED') {
                console.error('❌ Error checking Rasa status:', error.message);
            }

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
