const express = require('express');
const router = express.Router();
const { loadNLUData, saveIntentsToDatabase, exportNLUToYAML } = require('../rasa_scripts/nluController');
const db = require('../db/db'); // Pastikan Anda mengimpor koneksi database

// Endpoint untuk menyimpan intents
router.post('/', async (req, res) => {
    const { name, examples } = req.body;

    const query = `
        INSERT INTO intents (name, examples, created_at, updated_at)
        VALUES (?, ?, NOW(), NOW())
    `;

    try {
        const [result] = await db.query(query, [name, examples]);
        res.status(201).json({ message: 'Intent saved successfully', id: result.insertId });
    } catch (error) {
        console.error('Error saving intent:', error);
        res.status(500).json({ message: 'Error saving intent' });
    }
});

// Endpoint untuk mengambil semua intents
router.get('/', async (req, res) => {
    console.log('Received a request for intents');
    const query = 'SELECT * FROM intents';
    try {
        const [results] = await db.query(query);
        console.log('Retrieved intents:', results);
        res.json(results);
    } catch (error) {
        console.error('Error retrieving intents:', error);
        res.status(500).json({ message: 'Error retrieving intents' });
    }
});

// Endpoint untuk mengimpor NLU
router.post('/import', async (req, res) => {
    try {
        const nluData = loadNLUData(); 
        console.log('NLU Data:', nluData);

        if (nluData && nluData.nlu) {
            // Hapus semua intent yang ada sebelum mengimpor data baru
            await db.query('DELETE FROM intents');

            // Menggunakan saveIntentsToDatabase untuk menyimpan intents
            await saveIntentsToDatabase(nluData.nlu);
            
            res.status(200).json({ message: 'Intents imported successfully' });
        } else {
            res.status(400).json({ message: 'No intents found to import' });
        }
    } catch (error) {
        console.error('Error importing intents:', error);
        res.status(500).json({ message: 'Error importing intents' });
    }
});

// Endpoint untuk mengekspor NLU ke file YAML
router.get('/export', async (req, res) => {
    try {
        // Ambil intents dari database
        const [intents] = await db.query('SELECT name, examples FROM intents');

        // Gunakan fungsi exportNLUToYAML dari nluController untuk menulis ke file YAML
        const exportResult = await exportNLUToYAML(intents);

        if (exportResult && exportResult.success) { // Cek jika success ada dan true
            res.status(200).json({ message: 'nlu.yml updated successfully' });
        } else {
            res.status(500).json({ message: 'Failed to update nlu.yml' });
        }
    } catch (error) {
        console.error('Error exporting intents:', error);
        res.status(500).send('Failed to export intents');
    }
});

// Endpoint untuk meng-update intent berdasarkan ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, examples } = req.body;

    const query = `
        UPDATE intents
        SET name = ?, examples = ?, updated_at = NOW()
        WHERE id = ?
    `;

    try {
        const [result] = await db.query(query, [name, examples, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Intent not found' });
        }
        res.status(200).json({ message: 'Intent updated successfully' });
    } catch (error) {
        console.error('Error updating intent:', error);
        res.status(500).json({ message: 'Error updating intent' });
    }
});

// Endpoint untuk menghapus intent berdasarkan ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM intents WHERE id = ?`;
    
    try {
        const result = await db.query(query, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Intent not found' });
        }
        res.status(200).json({ message: 'Intent deleted successfully' });
    } catch (error) {
        console.error('Error deleting intent:', error);
        res.status(500).json({ message: 'Error deleting intent' });
    }
});

module.exports = router;
