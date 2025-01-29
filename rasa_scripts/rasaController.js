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
let isRasaLoading = false;  
let rasaPID = null;
let actionServerPID = null;
const modelsDir = path.join(__dirname, '..', 'Rasa', 'models');
const rasaPort = process.env.RASA_PORT || 5005;
const actionPort = 5055;
let lastLogFileName = getLogFileName();

// ✅ Tampilkan port saat mengecek statusnya
const isPortInUse = async (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            console.log(`🟡 Port ${port} is in use.`);
            resolve(err.code === 'EADDRINUSE');
        });
        server.once('listening', () => {
            console.log(`🟢 Port ${port} is free.`);
            server.close(() => resolve(false));
        });
        server.listen(port);
    });
};

// ✅ Saat Memulai Rasa, tampilkan port
const startRasa = async () => {
    if (isRasaRunning || isRasaLoading) {
        console.log("⚠️ Rasa server is already running or loading.");
        return;
    }

    const inUse = await isPortInUse(rasaPort);
    if (inUse) {
        console.log(`⚠️ Port ${rasaPort} is in use. Attempting to stop any running process...`);
        await killProcessOnPort(rasaPort);
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (await isPortInUse(rasaPort)) {
            console.error(`❌ Port ${rasaPort} is still in use after stopping the process. Exiting...`);
            return;
        }
    }

    isRasaLoading = true;
    const latestModel = getLatestModel();
    console.log(`🚀 Starting Rasa server on port ${rasaPort} with model: ${latestModel}`);

    try {
        rasaProcess = spawn('python', [
            '-m', 'rasa', 'run', 
            '--model', latestModel, 
            '--enable-api', 
            '--port', rasaPort, 
            '--endpoints', path.join(__dirname, '..', 'Rasa', 'endpoints.yml')
        ], {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        rasaPID = rasaProcess.pid;
        isRasaRunning = true;
        console.log(`✅ Rasa server started successfully on port ${rasaPort} with PID: ${rasaProcess.pid}`);

        rasaProcess.on('exit', (code, signal) => {
            console.log(`🛑 Rasa process exited with code ${code}, signal ${signal}`);
            isRasaRunning = false;
            isRasaLoading = false;
            rasaProcess = null;
        });

        await checkRasaReady();
        await startActionServer();
    } catch (error) {
        console.error(`❌ Failed to start Rasa server: ${error.message}`);
        isRasaRunning = false;
        isRasaLoading = false;
        rasaProcess = null;
    }
};

// ✅ Saat Memulai Action Server, tampilkan port
const startActionServer = async () => {
    if (isActionServerRunning) {
        console.log("⚠️ Rasa action server is already running.");
        return;
    }

    try {
        const cwdPath = path.join(__dirname, '..', 'Rasa');
        const pythonPath = path.join(__dirname, '..', 'Rasa');

        console.log(`🚀 Starting Rasa Action Server on port ${actionPort}...`);

        actionProcess = spawn('python', ['-m', 'rasa', 'run', 'actions', '--port', actionPort], {
            shell: true,
            cwd: cwdPath,
            env: { 
                ...process.env,
                PYTHONPATH: pythonPath,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        actionServerPID = actionProcess.pid;
        isActionServerRunning = true;
        console.log(`✅ Rasa action server started successfully on port ${actionPort} with PID: ${actionProcess.pid}`);

        actionProcess.on('exit', (code, signal) => {
            console.log(`🛑 Rasa action server exited with code ${code}, signal ${signal}`);
            isActionServerRunning = false;
            actionProcess = null;
        });

    } catch (error) {
        console.error(`❌ Failed to start Rasa action server: ${error.message}`);
    }
};

// ✅ Saat restart Rasa, tampilkan port
const restartRasa = async () => {
    console.log(`🔄 Restarting Rasa server on port ${rasaPort}...`);
    await stopRasa();

    const isPortFree = await waitForPortToBeFree(rasaPort);

    if (!isPortFree) {
        console.error(`❌ Cannot restart Rasa because port ${rasaPort} is still in use.`);
        return;
    }

    setTimeout(async () => {
        try {
            await startRasa();
        } catch (error) {
            console.error("❌ Error during restart:", error);
        }
    }, 1000); // Delay sebelum restart
};

// ✅ Saat stop Rasa, tampilkan port yang dibebaskan
const stopRasa = async () => {
    if (isRasaLoading) {
        console.log("⚠️ Rasa server is currently loading, cannot stop now.");
        return;
    }

    if (isRasaRunning) {
        console.log(`🛑 Stopping Rasa server on port ${rasaPort}...`);
        await killProcessOnPort(rasaPort);
        isRasaRunning = false;
        console.log(`✅ Rasa server on port ${rasaPort} stopped.`);
    } else {
        console.log("⚠️ Rasa server is not running.");
    }

    if (isActionServerRunning) {
        console.log(`🛑 Stopping Rasa action server on port ${actionPort}...`);
        await killProcessOnPort(actionPort);
        isActionServerRunning = false;
        console.log(`✅ Rasa action server on port ${actionPort} stopped.`);
    } else {
        console.log("⚠️ Rasa action server is not running.");
    }
};

// ✅ Saat mengecek apakah Rasa siap, tampilkan port
const checkRasaReady = async () => {
    let attempts = 0;
    const maxAttempts = 30;
    const checkInterval = 5000;

    console.log(`🔍 Checking if Rasa server on port ${rasaPort} is ready...`);

    const interval = setInterval(async () => {
        attempts++;
        try {
            const response = await axios.get(`http://localhost:${rasaPort}/status`);
            console.log('✅ Rasa server is online on port', rasaPort);
            clearInterval(interval);
            isRasaLoading = false;
        } catch (error) {
            console.error(`❌ Error checking Rasa status on port ${rasaPort} (attempt ${attempts}):`, error.message);
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.error('❌ Rasa server failed to start within the expected time.');
                isRasaLoading = false;
            }
        }
    }, checkInterval);
};

// Function to get the current Rasa process
const getRasaProcess = () => {
    return rasaProcess;
};

module.exports = {
    startRasa,
    stopRasa,
    restartRasa,
    getRasaProcess,
};
