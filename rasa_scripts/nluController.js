const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const db = require('../db/db'); // Make sure this path is correct
const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const version = "3.1"

let isRasaLoading = false;

// Function to load nlu.yml file
function loadNLUData() {
    const nluFilePath = path.resolve(__dirname, '..', 'Rasa-Framework', 'Rasa', 'data', 'nlu.yml');
    if (fs.existsSync(nluFilePath)) {
        try {
            const nluData = yaml.load(fs.readFileSync(nluFilePath, 'utf8'));
            return nluData;
        } catch (error) {
            console.error('Error loading nlu.yml:', error);
            return null;
        }
    } else {
        console.error(`File ${nluFilePath} not found.`);
        return null;
    }
}

// Clear the nlu.yml file
const clearNLUFile = async () => {
    const nluFilePath = path.resolve(__dirname, '..', 'Rasa-Framework', 'Rasa', 'data', 'nlu.yml');
    const clearedData = {
        version: '3.1',
        nlu: []
    };

    try {
        await fs.promises.writeFile(nluFilePath, yaml.dump(clearedData));
        console.log('nlu.yml cleared successfully');
    } catch (error) {
        console.error('Error clearing nlu.yml:', error);
    }
};

// Save intents to the database
const saveIntentsToDatabase = async (intents) => {
    const connection = await db.getConnection();
    try {
        for (const intent of intents) {
            const query = `
                INSERT INTO intents (name, examples, created_at, updated_at)
                VALUES (?, ?, NOW(), NOW())
            `;
            await connection.query(query, [intent.intent, intent.examples]);
        }
        console.log('Data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error);
    } finally {
        connection.release();
    }
};

// Get the latest intents from the database
const getIntentsFromDatabase = async () => {
    const connection = await db.getConnection();
    try {
        const query = `SELECT name, examples FROM intents`;
        const [rows] = await connection.query(query);
        return rows.map(row => ({
            intent: row.name,
            examples: row.examples
        }));
    } catch (error) {
        console.error('Error fetching intents from database:', error);
        return [];
    } finally {
        connection.release();
    }
};

// Export intents to nlu.yml file
const exportNLUToYAML = async () => {
    await clearNLUFile(); // Clear the nlu.yml file

    const intents = await getIntentsFromDatabase(); // Get latest intents from the database

    const uniqueIntents = {};
    intents.forEach(intent => {
        if (!uniqueIntents[intent.intent]) {
            uniqueIntents[intent.intent] = new Set();
        }

        intent.examples.split('\n').forEach(example => {
            const trimmedExample = example.trim();
            if (trimmedExample) {
                uniqueIntents[intent.intent].add(trimmedExample);
            }
        });
    });

    const updatedYAMLData = {
        version: version,
        nlu: Object.keys(uniqueIntents).map(intentName => ({
            intent: intentName,
            examples: Array.from(uniqueIntents[intentName]).join('\n') + '\n'
        }))
    };

    const updatedYamlStr = yaml.dump(updatedYAMLData, {
        lineWidth: -1,
        quotingType: '"',
    });

    const formattedYamlStr = updatedYamlStr.replace(/^version: .+/, match => `${match}\n`);
    const nluFilePath = path.resolve(__dirname, '..', 'Rasa-Framework', 'Rasa', 'data', 'nlu.yml');

    try {
        await fs.promises.writeFile(nluFilePath, formattedYamlStr);
        console.log('nlu.yml updated successfully');

        await trainRasaModel(); // Start Rasa training process

        return { success: true };
    } catch (error) {
        console.error('Error writing to nlu.yml:', error);
        return { success: false };
    }
};

// Train Rasa using the updated nlu.yml
const trainRasaModel = async () => {
    if (isRasaLoading) {
        console.log("Rasa is already training.");
        return;
    }

    isRasaLoading = true;  // Set loading flag

    console.log("Starting Rasa training...");

    try {
        // Check if Rasa executable exists by running 'which rasa' or 'where rasa'
        let rasaPath = '';
        try {
            // For Linux/macOS, use 'which'; for Windows, use 'where'
            const { stdout } = await exec(process.platform === 'win32' ? 'where rasa' : 'which rasa');
            rasaPath = stdout.trim();
        } catch (error) {
            console.error("Rasa executable not found. Please ensure Rasa is installed and available in your PATH.");
            isRasaLoading = false;
            return;
        }

        console.log(`Rasa executable found at: ${rasaPath}`);

        // Define the path to the custom Rasa training configuration (if any)
        const configPath = path.join(__dirname, '..', 'Rasa-Framework', 'Rasa', 'config.yml');
        const domainPath = path.join(__dirname, '..', 'Rasa-Framework', 'Rasa', 'domain.yml');
        const dataPath = path.join(__dirname, '..', 'Rasa-Framework', 'Rasa', 'data'); // Assuming your data is under 'data'
        
        // Define the output path where the trained model will be saved
        const outputPath = path.join(__dirname, '..', 'Rasa-Framework', 'Rasa', 'models');

        // Execute the `rasa train` command with the specified paths for configuration, domain, data, and output
        const trainProcess = spawn(rasaPath, [
            'train',
            '--config', configPath,      // Point to the custom config.yml
            '--domain', domainPath,      // Point to the custom domain.yml
            '--data', dataPath,          // Point to the custom training data directory
            '--out', outputPath          // Specify the output directory for the trained model
        ], {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        trainProcess.stdout.on('data', (data) => {
            console.log(`Rasa train stdout: ${data.toString()}`);
        });

        trainProcess.stderr.on('data', (data) => {
            console.error(`Rasa train stderr: ${data.toString()}`);
        });

        trainProcess.on('exit', (code, signal) => {
            console.log(`Rasa training completed with code ${code}, signal ${signal}`);
            if (code === 0) {
                console.log("Rasa model trained successfully!");
            } else {
                console.error("Rasa training failed!");
            }
            isRasaLoading = false;
        });
    } catch (error) {
        console.error(`Error during Rasa training: ${error.message}`);
        isRasaLoading = false;
    }
};

module.exports = { loadNLUData, saveIntentsToDatabase, exportNLUToYAML };
