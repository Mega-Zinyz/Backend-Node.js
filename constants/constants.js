const path = require('path');

// Function to get the current date in YYYY-MM-DD format
const getLogFileName = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `log_${year}-${month}-${day}.txt`;
};

// Log file path based on the current date
const logFilePath = path.join(__dirname, '..', 'Rasa-Framework', 'Rasa', 'log', getLogFileName());

module.exports = { logFilePath, getLogFileName };
