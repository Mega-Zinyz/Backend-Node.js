const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const db = require('../db/db'); // Ensure this path is correct
const version = "2.0";

// Function to load rules from the database
const getRulesFromDatabase = async () => {
    const connection = await db.getConnection();
    try {
        const query = `SELECT name, steps FROM rules`; // Adjust the table name and columns as needed
        const [rows] = await connection.query(query);

        return rows.map(row => ({
            rule: row.name,
            steps: row.steps // Assume steps are in a format that can be directly used
        }));
    } catch (error) {
        console.error('Error fetching rules from database:', error);
        return [];
    } finally {
        connection.release();
    }
};

// Function to clear existing rules.yml
const clearRulesFile = async () => {
    const rulesFilePath = path.resolve(__dirname, '..', 'Rasa', 'data', 'rules.yml');
    const clearedData = {
        version: '2.0',
        rules: []
    };

    try {
        await fs.promises.writeFile(rulesFilePath, yaml.dump(clearedData));
        console.log('rules.yml cleared successfully');
    } catch (error) {
        console.error('Error clearing rules.yml:', error);
    }
};

// Export rules to YAML
const exportRulesToYAML = async () => {
    await clearRulesFile();

    const rules = await getRulesFromDatabase();

    const updatedYAMLData = {
        version: version,
        rules: rules.map(rule => ({
            rule: rule.rule,
            steps: rule.steps.split('\n').map(step => step.trim()).filter(Boolean) // Adjust step format as needed
        }))
    };

    const updatedYamlStr = yaml.dump(updatedYAMLData, {
        lineWidth: -1,
        quotingType: '"',
    });

    const rulesFilePath = path.resolve(__dirname, '..', 'Rasa', 'data', 'rules.yml');

    try {
        await fs.promises.writeFile(rulesFilePath, updatedYamlStr);
        console.log('rules.yml updated successfully');
        return { success: true };
    } catch (error) {
        console.error('Error writing to rules.yml:', error);
        return { success: false };
    }
};

// Export functions for use in routes
module.exports = { exportRulesToYAML };
