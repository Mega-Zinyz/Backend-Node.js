const express = require('express');
const router = express.Router();
const dashboardController = require('../rasa_scripts/viewdashboardController'); // Pastikan path sudah benar

// Route untuk mendapatkan total intents
router.get('/total-intents', async (req, res) => {
  try {
    const result = await dashboardController.getTotalIntents(req, res);
    console.log('Total Intents:', result);
    res.json(result);  // Pastikan kita mengirimkan hasil ke client
  } catch (err) {
    console.log('Error fetching total intents:', err);
    res.status(500).json({ error: 'Error fetching total intents', details: err.message });
  }
});

// Route untuk mendapatkan available rooms
router.get('/available-rooms', async (req, res) => {
  try {
    const result = await dashboardController.getAvailableRooms(req, res);
    console.log('Available Rooms:', result);
    res.json(result);  // Pastikan kita mengirimkan hasil ke client
  } catch (err) {
    console.log('Error fetching available rooms:', err);
    res.status(500).json({ error: 'Error fetching available rooms', details: err.message });
  }
});

// Route untuk mendapatkan user registrations
router.get('/user-registrations', async (req, res) => {
  try {
    const result = await dashboardController.getUserRegistrations(req, res);
    console.log('User Registrations:', result);
    res.json(result);  // Pastikan kita mengirimkan hasil ke client
  } catch (err) {
    console.log('Error fetching user registrations:', err);
    res.status(500).json({ error: 'Error fetching user registrations', details: err.message });
  }
});

module.exports = router;
