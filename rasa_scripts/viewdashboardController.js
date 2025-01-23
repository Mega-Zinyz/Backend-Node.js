const db = require('../db/db'); // Import the database connection
const winston = require('winston'); // Logger setup

// Logger setup (if not already configured in your app.js)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ]
});

// Function to get total intents
const getTotalIntents = async () => {
  const query = 'SELECT COUNT(*) AS totalIntents FROM intents';
  logger.info('Executing query to fetch total intents');

  try {
    const [results] = await db.query(query);
    
    // Menampilkan hasil query ke console
    console.log('Total Intents Query Result:', results);

    if (results.length === 0) {
      logger.warn('No results found for total intents');
      return { error: 'No intents found' };
    }

    logger.info(`Fetched total intents: ${results[0].totalIntents}`);
    return { totalIntents: results[0].totalIntents };
  } catch (err) {
    logger.error(`Error fetching total intents: ${err.message}`);
    return { error: 'Failed to fetch total intents', details: err.message };
  }
};

// Function to get available rooms
const getAvailableRooms = async () => {
  const query = 'SELECT COUNT(*) AS availableRooms FROM rooms WHERE available = 1';
  logger.info('Executing query to fetch available rooms');

  try {
    const [results] = await db.query(query);

    // Menampilkan hasil query ke console
    console.log('Available Rooms Query Result:', results);

    if (results.length === 0) {
      logger.warn('No available rooms found');
      return { error: 'No available rooms found' };
    }

    logger.info(`Fetched available rooms: ${results[0].availableRooms}`);
    return { availableRooms: results[0].availableRooms };
  } catch (err) {
    logger.error(`Error fetching available rooms: ${err.message}`);
    return { error: 'Failed to fetch available rooms', details: err.message };
  }
};

// Function to get user registrations
const getUserRegistrations = async () => {
  const query = 'SELECT COUNT(*) AS userRegistrations FROM user_account';
  logger.info('Executing query to fetch user registrations');

  try {
    const [results] = await db.query(query);

    // Menampilkan hasil query ke console
    console.log('User Registrations Query Result:', results);

    if (results.length === 0) {
      logger.warn('No user registrations found');
      return { error: 'No user registrations found' };
    }

    logger.info(`Fetched user registrations: ${results[0].userRegistrations}`);
    return { userRegistrations: results[0].userRegistrations };
  } catch (err) {
    logger.error(`Error fetching user registrations: ${err.message}`);
    return { error: 'Failed to fetch user registrations', details: err.message };
  }
};

module.exports = {
  getTotalIntents,
  getAvailableRooms,
  getUserRegistrations,
};
