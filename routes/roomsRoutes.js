const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../db/db');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../assets/room_img')); // Directory for profile images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true); // Allow file upload
        } else {
            console.log('Invalid file type:', file.mimetype);
            cb(new Error('Only images (jpeg, jpg, png) are allowed'));
        }
    },
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB file size limit
});

// Get all rooms
router.get('/', async (req, res) => {
    try {
        console.log('Fetching all rooms...');
        const [rows] = await db.query('SELECT id, name, description, imageUrl, available FROM rooms');
        console.log('Rooms fetched:', rows);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching rooms:', err);
        res.status(500).send('Server error');
    }
});

// Add a new room with image upload
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, description, available } = req.body;
        console.log('Received body:', { name, description, available });

        const imageUrl = req.file ? `/room_img/${req.file.filename}` : null;
        console.log('Image URL set to:', imageUrl);

        // Ensure name and description are not empty
        if (!name || !description) {
            console.log('Error: Name and description are required');
            return res.status(400).json({ message: 'Name and description are required' });
        }

        // Check if room already exists
        const [existingRoom] = await db.query('SELECT id FROM rooms WHERE name = ?', [name]);
        if (existingRoom.length > 0) {
            console.log('Error: Room with this name already exists');
            return res.status(400).json({ message: 'A room with this name already exists' });
        }

        // Ensure 'available' is 1 or 0, default to '1'
        const roomAvailable = (available === '1' || available === '0') ? available : '1';
        console.log('Available set to:', roomAvailable);

        // Insert new room into the database
        const [result] = await db.query('INSERT INTO rooms (name, description, imageUrl, available) VALUES (?, ?, ?, ?)', [name, description, imageUrl, roomAvailable]);
        console.log('New room inserted with ID:', result.insertId);

        res.status(201).json({ id: result.insertId, name, description, imageUrl, available: roomAvailable });
    } catch (err) {
        console.error('Error adding room:', err);
        res.status(500).send('Server error');
    }
});

// Delete a room
router.delete('/:id', async (req, res) => {
    const roomId = req.params.id;
    console.log('Received request to delete room with ID:', roomId);

    try {
        // Fetch room details before deletion
        const [results] = await db.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
        if (results.length === 0) {
            console.log('Error: Room not found');
            return res.status(404).json({ error: 'Room not found' });
        }

        const room = results[0];
        const imagePath = room.imageUrl;
        console.log('Room details:', room);

        // Delete room from the database
        await db.query('DELETE FROM rooms WHERE id = ?', [roomId]);
        console.log('Room deleted from database');

        // Delete the image if it exists
        if (imagePath) {
            const fullImagePath = path.join(__dirname, '/room_img/', imagePath);
            console.log('Deleting image:', fullImagePath);
            await fs.promises.unlink(fullImagePath); // Delete image file
            console.log('Image deleted successfully');
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
    console.log('Fetching room with ID:', id);

    try {
        const [room] = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);
        if (room.length === 0) {
            console.log('Error: Room not found');
            return res.status(404).json({ message: 'Room not found' });
        }
        console.log('Room details:', room[0]);
        res.json(room[0]);
    } catch (error) {
        console.error('Error retrieving room:', error);
        res.status(500).json({ message: 'Error retrieving room' });
    }
});

// Update room details and image
router.put('/:id', upload.single('image'), async (req, res) => {
    const roomId = req.params.id;
    const { name, description, available } = req.body;
    const imageUrl = req.file ? `/room_img/${req.file.filename}` : null;
    console.log('Received body for update:', { name, description, available });
    console.log('Received file for update:', req.file);

    try {
        if (!name || !description) {
            console.log('Error: Name and description are required');
            return res.status(400).json({ message: 'Name and description are required' });
        }

        // Check if room name already exists
        const [existingRoom] = await db.query('SELECT * FROM rooms WHERE name = ? AND id != ?', [name, roomId]);
        if (existingRoom.length > 0) {
            console.log('Error: Room with this name already exists');
            return res.status(400).json({ message: 'Room with this name already exists' });
        }

        const [roomResults] = await db.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
        if (roomResults.length === 0) {
            console.log('Error: Room not found');
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = roomResults[0];
        const oldImagePath = room.imageUrl;
        console.log('Old image path:', oldImagePath);

        // Ensure 'available' is 1 or 0, otherwise use the existing value
        const roomAvailable = (available === '1' || available === '0') ? available : room.available;
        console.log('Available set to:', roomAvailable);

        // Update room in the database
        await db.query('UPDATE rooms SET name = ?, description = ?, imageUrl = ?, available = ? WHERE id = ?', [name, description, imageUrl || oldImagePath, roomAvailable, roomId]);
        console.log('Room updated in database');

        // Delete old image if a new one is uploaded
        if (imageUrl && oldImagePath) {
            const fullImagePath = path.join(__dirname, '/room_img/', oldImagePath);
            console.log('Deleting old image:', fullImagePath);
            await fs.promises.unlink(fullImagePath); // Delete the old image
            console.log('Old image deleted successfully');
        }

        res.status(200).json({ message: 'Room updated successfully' });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ message: 'Error updating room' });
    }
});

module.exports = router;
