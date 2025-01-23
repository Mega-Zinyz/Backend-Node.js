const express = require('express');
const router = express.Router();
const { exportRulesToYAML } = require('../rasa_scripts/rulesController');
const db = require('../db/db');

// Endpoint to export rules to YAML
router.get('/export', async (req, res) => {
    try {
        const exportResult = await exportRulesToYAML();

        if (exportResult && exportResult.success) {
            res.status(200).json({ message: 'rules.yml updated successfully' });
        } else {
            res.status(500).json({ message: 'Failed to update rules.yml' });
        }
    } catch (error) {
        console.error('Error exporting rules:', error);
        res.status(500).send('Failed to export rules');
    }
});

// Add additional routes for managing rules in the database (create, read, update, delete)

// Example: Endpoint to save a new rule
router.post('/', async (req, res) => {
    const { name, steps } = req.body;

    const query = `INSERT INTO rules (name, steps, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`;

    try {
        const [result] = await db.query(query, [name, steps]);
        res.status(201).json({ message: 'Rule saved successfully', id: result.insertId });
    } catch (error) {
        console.error('Error saving rule:', error);
        res.status(500).json({ message: 'Error saving rule' });
    }
});

// Additional CRUD operations can be added similarly...

module.exports = router;
