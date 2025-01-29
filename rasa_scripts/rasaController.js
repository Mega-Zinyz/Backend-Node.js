const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const axios = require('axios');
const { getLogFileName } = require('../constants/constants');

let rasaProcess = null;
let actionProcess = null;
let isRasaRunning = false;
let isActionServerRunning = false;
let isRasaLoading = false;  // Flag to indicate if Rasa is starting or stopping
const modelsDir = path.join(__dirname, '..', 'Rasa', 'models');
let lastLogFileName = getLogFileName();

// Function to write log data to a file
const writeLogToFile = (data) => {
    const currentLogFileName = getLogFileName();
    const currentLogFilePath = path.join(__dirname, '..', 'Rasa', 'log', currentLogFileName);
    fs.appendFile(currentLogFilePath, data, (err) => {
        if (err) console.error('Error writing to log file:', err);
    });
};

// Function to get the latest model file from the models directory
const getLatestModel = () => {
    if (!fs.existsSync(modelsDir)) throw new Error('Model directory does not exist');

    const files = fs.readdirSync(modelsDir).filter(file => file.endsWith('.tar.gz'));
    if (files.length === 0) throw new Error('No model files found in the directory');

    const latestModel = files.sort((a, b) => fs.statSync(path.join(modelsDir, b)).mtime - fs.statSync(path.join(modelsDir, a)).mtime)[0];
    return path.join(modelsDir, latestModel);
};

// Function to check if a port is in use
const isPortInUse = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.on('error', (err) => resolve(err.code === 'EADDRINUSE'));
        server.listen(port, () => {
            server.close();
            resolve(false);
        });
    });
};

function killProcessOnPort(port) {
    // Try using netstat first, as ss might not be available
    const findProcessCommand = process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `netstat -tuln | grep :${port}`;  // Use netstat instead of ss for fallback

    exec(findProcessCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error finding process: ${stderr}`);
            return;
        }

        if (!stdout) {
            console.log(`No processes found on port ${port}.`);
            return;
        }

        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1]; // Last part is the PID
            if (parts.includes('LISTEN')) {
                const killCommand = process.platform === 'win32'
                    ? `taskkill /PID ${pid} /F`
                    : `kill -9 ${pid}`;  // Use kill -9 to terminate process

                exec(killCommand, (killErr, killStdout, killStderr) => {
                    if (killErr) {
                        console.error(`Error killing process ${pid}: ${killStderr}`);
                    } else {
                        console.log(`Killed process ${pid} on port ${port}`);
                    }
                });
            }
        });
    });
}

const startRasa = async () => {
    if (isRasaRunning || isRasaLoading) {
        console.log("Rasa server is already running or loading.");
        return;
    }

    const port = process.env.RASA_PORT || 5005;

    const inUse = await isPortInUse(port);
    if (inUse) {
        console.log(`Port ${port} is already in use. Attempting to stop any running process...`);
        await killProcessOnPort(port);
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (await isPortInUse(port)) {
            console.error(`Port ${port} is still in use after stopping the process. Exiting...`);
            return;
        }
    }

    isRasaLoading = true;
    const latestModel = getLatestModel();
    console.log(`Starting Rasa server with model: ${latestModel}`);
    writeLogToFile(`Starting Rasa server with model: ${latestModel}\n`);

    try {
        rasaProcess = spawn('python', [
            '-m', 'rasa', 'run', 
            '--model', latestModel, 
            '--enable-api', 
            '--endpoints', path.join(__dirname, '..', 'Rasa', 'endpoints.yml')
        ], {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
                
        isRasaRunning = true;
        console.log(`Rasa server started successfully with PID: ${rasaProcess.pid}`);
        writeLogToFile(`Rasa server started successfully with PID: ${rasaProcess.pid}\n`);

        rasaProcess.on('exit', (code, signal) => {
            console.log(`Rasa process exited with code ${code}, signal ${signal}`);
            writeLogToFile(`Rasa server exited with code ${code}, signal ${signal}\n`);
            isRasaRunning = false;
            isRasaLoading = false;
            rasaProcess = null;
        });

        rasaProcess.stderr.on('data', (data) => {
            const logData = `Rasa Error: ${data.toString()}`;
            console.error(logData);
            writeLogToFile(logData);
        });

        await checkRasaReady();
        await startActionServer();
    } catch (error) {
        console.error(`Failed to start Rasa server: ${error.message}`);
        writeLogToFile(`Failed to start Rasa server: ${error.message}\n`);
        isRasaRunning = false;
        isRasaLoading = false;
        rasaProcess = null;
    }
};

const startActionServer = async () => {
    if (isActionServerRunning) {
        console.log("Rasa action server is already running.");
        return;
    }

    try {
        const cwdPath = path.join(__dirname, '..', 'Rasa');
        const pythonPath = path.join(__dirname, '..', 'Rasa');

        actionProcess = spawn('python', ['-m', 'rasa', 'run', 'actions'], {
            shell: true,
            cwd: cwdPath,
            env: { 
                ...process.env,
                PYTHONPATH: pythonPath,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        isActionServerRunning = true;
        console.log(`Rasa action server started successfully with PID: ${actionProcess.pid}`);

        actionProcess.on('exit', (code, signal) => {
            console.log(`Rasa action server exited with code ${code}, signal ${signal}`);
            isActionServerRunning = false;
            actionProcess = null;
        });

        actionProcess.stderr.on('data', (data) => {
            const logData = `Rasa Action Error: ${data.toString()}`;
            console.error(logData);
            writeLogToFile(logData);
        });
    } catch (error) {
        console.error(`Failed to start Rasa action server: ${error.message}`);
    }
};

const checkRasaReady = async () => {
    let attempts = 0;
    const maxAttempts = 30;
    const checkInterval = 5000;

    const interval = setInterval(async () => {
        attempts++;
        try {
            const response = await axios.get('http://localhost:5005/status');
            console.log('Response data:', response.data); 
            if (response.data && response.data.model_file) {
                clearInterval(interval);
                console.log('Rasa server is online.');
                isRasaLoading = false;
            }
        } catch (error) {
            console.error(`Error checking Rasa status (attempt ${attempts}):`, error.response ? error.response.data : error.message);
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.error('Failed to start Rasa server: Rasa server failed to start within the expected time.');
                isRasaLoading = false;
            }
        }
    }, checkInterval);
};

const stopRasa = async () => {
    if (isRasaLoading) {
        console.log("Rasa server is currently loading, cannot stop now.");
        return;
    }

    if (isRasaRunning) {
        console.log("Stopping Rasa server...");
        isRasaLoading = true;

        await killProcessOnPort(process.env.RASA_PORT || 5005);
        isRasaRunning = false;
        console.log("Rasa server stopped.");
    } else {
        console.log("Rasa server is not running.");
    }

    if (isActionServerRunning) {
        console.log("Stopping Rasa action server...");
        await killProcessOnPort(5055);
        isActionServerRunning = false;
        console.log("Rasa action server stopped.");
    } else {
        console.log("Rasa action server is not running.");
    }

    isRasaLoading = false;
};

const restartRasa = async () => {
    console.log("Restarting Rasa server...");
    await stopRasa();
    setTimeout(async () => {
        try {
            await startRasa();
            await startActionServer();
        } catch (error) {
            console.error("Error during restart:", error);
        }
    }, 1000); // Delay before restarting
};

// Function to get the current Rasa process
const getRasaProcess = () => {
    return rasaProcess;
};

module.exports = {
    startRasa,
    stopRasa,
    restartRasa,
    getRasaProcess
};
