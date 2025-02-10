require('dotenv').config();

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const axios = require('axios');
const rasaUrl = process.env.RASA_URL;
const db = require('../db/db');

let rasaProcess = null;
let actionProcess = null;
let isRasaRunning = false;
let isActionServerRunning = false;
let isRasaLoading = false;  // Flag to indicate if Rasa is starting or stopping
let rasaPID = null;
let actionServerPID = null;
const modelsDir = path.join(__dirname, '..', 'Rasa', 'models');

// Fungsi untuk menulis log ke MySQL
const writeLogToDatabase = async (logLevel, message) => {
    try {
        if (!message || message.trim() === '') {
            console.warn('Skipping log entry: message is empty.');
            return;
        }

        const query = 'INSERT INTO rasa_logs (log_level, message) VALUES (?, ?)';
        await db.query(query, [logLevel, message]);

    } catch (error) {
        console.error('Error writing log to database:', error.message);
    }
};

// Function to get the latest model safely
const getLatestModel = () => {
    try {
        // Pastikan direktori model ada
        if (!fs.existsSync(modelsDir)) {
            throw new Error('Model directory does not exist');
        }

        // Ambil semua file dengan ekstensi .tar.gz
        const files = fs.readdirSync(modelsDir).filter(file => file.endsWith('.tar.gz'));

        // Jika tidak ada file model, lempar error
        if (files.length === 0) {
            throw new Error('No model files found in the directory');
        }

        // Mengurutkan file berdasarkan tanggal yang ada di nama file (format: YYYYMMDD-HHMMSS)
        const latestModel = files.sort((a, b) => {
            const dateA = new Date(a.slice(0, 4), a.slice(4, 6) - 1, a.slice(6, 8), a.slice(9, 11), a.slice(11, 13), a.slice(13, 15));
            const dateB = new Date(b.slice(0, 4), b.slice(4, 6) - 1, b.slice(6, 8), b.slice(9, 11), b.slice(11, 13), b.slice(13, 15));
            return dateB - dateA; // Urutkan dari yang terbaru
        })[0];

        // Kembalikan path lengkap ke model terbaru
        return path.join(modelsDir, latestModel);

    } catch (error) {
        console.error('Error getting latest model:', error.message);
        throw error;  // Rethrow so it can be handled higher up
    }
};

// Function to check if a port is in use
const isPortInUse = async (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => resolve(err.code === 'EADDRINUSE'));
        server.once('listening', () => server.close(() => resolve(false)));
        server.listen(port);
    });
};

const waitForPortToBeFree = async (port, timeout = 10000) => {
    const startTime = Date.now();
    while (await isPortInUse(port)) {
        console.log(`Waiting for port ${port} to be free...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Tunggu 1 detik sebelum cek lagi
        if (Date.now() - startTime > timeout) {
            console.error(`Port ${port} is still in use after timeout.`);
            return false;
        }
    }
    return true;
};

const killProcessOnPort = async (port) => {
    try {
        const inUse = await isPortInUse(port);
        if (!inUse) {
            console.log(`✅ Tidak ada proses yang berjalan di port ${port}.`);
            return;
        }

        console.log(`⚠️ Mencoba membunuh proses di port ${port}...`);

        // Cari PID proses yang menggunakan port
        exec(`lsof -t -i:${port}`, (error, stdout, stderr) => {
            if (error || !stdout) {
                console.error(`❌ Gagal menemukan proses di port ${port}: ${stderr || error.message}`);
                return;
            }

            const pid = stdout.trim();
            console.log(`🔍 Menemukan PID ${pid} di port ${port}.`);

            // Hentikan proses secara paksa
            exec(`kill -9 ${pid}`, (killError) => {
                if (killError) {
                    console.error(`❌ Gagal membunuh proses ${pid}: ${killError.message}`);
                } else {
                    console.log(`✅ Berhasil membunuh proses ${pid} di port ${port}.`);
                }
            });
        });

        // Tunggu beberapa detik untuk memastikan port benar-benar bebas
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (await isPortInUse(port)) {
            console.error(`❌ Port ${port} masih digunakan setelah percobaan kill.`);
        } else {
            console.log(`✅ Port ${port} sekarang bebas.`);
        }
    } catch (error) {
        console.error(`❌ Kesalahan saat membunuh proses di port ${port}: ${error.message}`);
    }
};

// Improved startRasa function
const startRasa = async () => {
    if (isRasaRunning || isRasaLoading) {
        console.log("Rasa server is already running or loading.");
        return;
    }

    const port = process.env.RASA_PORT;
    console.log(`Checking if port ${port} is available...`);

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
    let latestModel;

    try {
        latestModel = getLatestModel();
        console.log(`Starting Rasa server on port ${port} with model: ${latestModel}`);
        // Call to writeLogToDatabase safely
        await writeLogToDatabase('info', `Starting Rasa server on port ${port} with model: ${latestModel}\n`);
    } catch (error) {
        console.error(`Failed to get the latest model: ${error.message}`);
        isRasaLoading = false;
        return;  // Exit if there's an error retrieving the model
    }

    try {
        rasaProcess = spawn('python', [
            '-m', 'rasa', 'run',
            '--model', latestModel,
            '--enable-api',
            '--port', port, // Ensure port is specified here
            '--endpoints', path.join(__dirname, '..', 'Rasa', 'endpoints.yml')
        ], {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        rasaPID = rasaProcess.pid;
        isRasaRunning = true;
        console.log(`Rasa server started successfully on port ${port} with PID: ${rasaProcess.pid}`);
        await writeLogToDatabase('info', `Rasa server started successfully on port ${port} with PID: ${rasaProcess.pid}\n`);

        rasaProcess.on('exit', (code, signal) => {
            console.log(`Rasa process exited with code ${code}, signal ${signal}`);
            writeLogToDatabase('error', `Rasa server exited with code ${code}, signal ${signal}\n`);
            isRasaRunning = false;
            isRasaLoading = false;
            rasaProcess = null;
        });

        rasaProcess.stderr.on('data', (data) => {
            const logData = `Rasa : ${data.toString()}`;
            writeLogToDatabase('error', logData);  // Log errors as 'error' level
            console.log(logData);
        });

        await checkRasaReady();
        await startActionServer();
    } catch (error) {
        console.error(`Failed to start Rasa server: ${error.message}`);
        writeLogToDatabase('error', `Failed to start Rasa server: ${error.message}\n`);
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

        // Inisialisasi actionProcess sebelum menggunakan actionProcess.pid
        actionProcess = spawn('python', ['-m', 'rasa', 'run', 'actions'], {
            shell: true,
            cwd: cwdPath,
            env: { 
                ...process.env,
                PYTHONPATH: pythonPath,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });        

        actionServerPID = actionProcess.pid; // Sekarang actionProcess.pid dapat diakses
        isActionServerRunning = true;
        console.log(`Rasa action server started successfully with PID: ${actionProcess.pid}`);

        actionProcess.on('exit', (code, signal) => {
            console.log(`Rasa action server exited with code ${code}, signal ${signal}`);
            isActionServerRunning = false;
            actionProcess = null;
        });

        actionProcess.stderr.on('data', (data) => {
            const logData = `Rasa Action : ${data.toString()}`;
            console.log(logData);
            writeLogToDatabase(logData);
        });
    } catch (error) {
        console.error(`Failed to start Rasa action server: ${error.message}`);
    }
};

const checkRasaReady = async () => {
    let attempts = 0;
    const maxAttempts = 30;
    const checkInterval = 5000;
    let lastStatus = null; // Menyimpan status terakhir

    const interval = setInterval(async () => {
        attempts++;
        try {
            const response = await axios.get(`${rasaUrl}/status`);

            if (response.data && response.data.model_file) {
                clearInterval(interval);
                console.log('✅ Rasa server is online.');
                isRasaLoading = false;
                return;
            }

            // Cek apakah status berubah sejak terakhir dicetak
            if (attempts % 5 === 0 && lastStatus !== "waiting") {
                console.info(`ℹ️ Rasa server is running but model is not ready (attempt ${attempts}/${maxAttempts})`);
                lastStatus = "waiting"; // Simpan status terakhir
            }
        } catch (error) {
            // Jika error terjadi sebelum batas maksimum, cukup diam (silent mode)
            if (attempts < maxAttempts) return; 

            // Jika error setelah batas maksimum, baru cetak error
            clearInterval(interval);
            console.error('❌ Failed to start Rasa server: No response received after maximum attempts.');
            isRasaLoading = false;
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

        await killProcessOnPort(process.env.RASA_PORT);
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

    const port = process.env.RASA_PORT;
    const isPortFree = await waitForPortToBeFree(port);

    if (!isPortFree) {
        console.error("Cannot restart Rasa because port is still in use.");
        return;
    }

    setTimeout(async () => {
        try {
            await startRasa();
        } catch (error) {
            console.error("Error during restart:", error);
        }
    }, 1000); // Delay sebelum restart
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
