const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../db/db');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../assets/room_img'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png) are allowed'));
        }
    },
    limits: { fileSize: 2 * 1024 * 1024 } // Set file size limit to 2MB
});

// Get all rooms
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, description, imageUrl FROM rooms');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching rooms:', err);
        res.status(500).send('Server error');
    }
});

// Add a new room with image upload
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const imageUrl = req.file ? `/../assets/room_img/${req.file.filename}` : null;

        if (!name || !description) {
            return res.status(400).json({ message: 'Name and description are required' });
        }

        const [result] = await db.query('INSERT INTO rooms (name, description, imageUrl) VALUES (?, ?, ?)', [name, description, imageUrl]);
        res.status(201).json({ id: result.insertId, name, description, imageUrl });
    } catch (err) {
        console.error('Error adding room:', err);
        res.status(500).send('Server error');
    }
});

// Delete a room
router.delete('/:id', async (req, res) => {
    const roomId = req.params.id;

    try {
        const [results] = await db.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const room = results[0];
        const imagePath = room.imageUrl;

        await db.query('DELETE FROM rooms WHERE id = ?', [roomId]);

        if (imagePath) {
            const fullImagePath = path.join(__dirname, '../assets/img/', imagePath);
            await fs.promises.unlink(fullImagePath);
        }

        res.status(200).json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Error during delete operation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get room by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [room] = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);
        if (room.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json(room[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving room' });
    }
});

// Update room details and image
router.put('/:id', upload.single('image'), async (req, res) => {
    const roomId = req.params.id;
    const { name, description } = req.body;
    const imageUrl = req.file ? `/../assets/room_img/${req.file.filename}` : null;

    try {
        if (!name || !description) {
            return res.status(400).json({ message: 'Name and description are required' });
        }

        const [roomResults] = await db.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
        if (roomResults.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = roomResults[0];
        const oldImagePath = room.imageUrl;

        await db.query('UPDATE rooms SET name = ?, description = ?, imageUrl = ? WHERE id = ?', [name, description, imageUrl || oldImagePath, roomId]);

        if (imageUrl && oldImagePath) {
            const fullImagePath = path.join(__dirname, '../../FrontEnd-Chatbot/public', oldImagePath);
            await fs.promises.unlink(fullImagePath);
        }

        res.status(200).json({ message: 'Room updated successfully' });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ message: 'Error updating room' });
    }
});

module.exports = router;
