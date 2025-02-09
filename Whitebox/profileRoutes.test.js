const request = require('supertest');
const app = require('../app');
const db = require('../db/db');
const fs = require('fs');
const path = require('path');

// Mock the database and file system
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),  // Keep the actual fs methods that are needed
  existsSync: jest.fn().mockReturnValue(true),  // Mock fs.existsSync to always return true
  unlink: jest.fn(),  // Keep the unlink mock for file deletion
}));

// Mock db methods
jest.mock('../db/db', () => ({
  getConnection: jest.fn().mockResolvedValue({
    release: jest.fn(), // Mock the release function to avoid leaks
  }),
  query: jest.fn(),
  releaseConnection: jest.fn(), // Mock the releaseConnection method to clean up
}));

describe('User Routes', () => {

  // Clean database before tests
  beforeAll(async () => {
    // Setup any necessary test data in your DB if required.
    // This should reset your data before all tests
    db.query.mockResolvedValue([]); // Mock a clean database response
  });

  // Close database connection after tests
  afterAll(async () => {
    // Ensure that the connection pool is closed
    if (db.pool) {
      await db.pool.end();  // This will close the entire pool if using a pool
    }
  });

  // Cleanup after each test (clear mocks, etc.)
  afterEach(() => {
    jest.clearAllMocks();  // Clear all mocks to avoid memory leaks
    fs.unlink.mockClear();  // Clear file system mocks to avoid unnecessary accumulation
  });

  // Test for GET /api/profile/accounts
  describe('GET /api/profile/accounts', () => {
    it('should return all user accounts with a status of 200', async () => {
      const mockUsers = [
        { no_user: '1', username: 'user1' },
        { no_user: '2', username: 'user2' }
      ];

      db.query.mockResolvedValue([mockUsers]); // Mock successful DB query

      const response = await request(app).get('/api/profile/accounts');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('username');
    });

    it('should handle errors gracefully if database query fails', async () => {
      db.query.mockRejectedValue(new Error('Database error')); // Simulate DB error

      const response = await request(app).get('/api/profile/accounts');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to load users.');
    });
  });

  // Test for GET /api/profile/accounts/:no_user
  describe('GET /api/profile/accounts/:no_user', () => {
    it('should return a user profile with status 200 when user exists', async () => {
      const mockUser = { no_user: '123', username: 'testuser', profil_url: 'profile.jpg' };

      db.query.mockResolvedValue([mockUser]); // Mock user data

      const response = await request(app).get('/api/profile/accounts/123');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('profil_url');
      expect(response.body.profil_url).toContain('profile.jpg');
    });

    it('should return 404 if user does not exist', async () => {
      db.query.mockResolvedValue([[]]); // Simulate no user found

      const response = await request(app).get('/api/profile/accounts/nonexistent_id');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found.');
    });
  });

  // Test for POST /register
  describe('POST /register', () => {
    it('should register a new user and return 201 status', async () => {
      const newUser = { username: 'newuser', password: 'password123' };
      const mockFile = { filename: 'profile.jpg' }; // Mock file upload

      db.query.mockResolvedValue([[]]); // Mock no existing users

      const response = await request(app)
        .post('/register')
        .field('username', newUser.username)
        .field('password', newUser.password)
        .attach('profil_url', mockFile.filename);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully!');
    });

    it('should return 409 if username already exists', async () => {
      const existingUser = { username: 'existinguser', password: 'password123' };

      db.query.mockResolvedValue([[{ username: 'existinguser' }]]);  // Simulate existing user

      const response = await request(app)
        .post('/register')
        .send(existingUser);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Username already exists.');
    });

    it('should handle registration errors gracefully', async () => {
      const newUser = { username: 'newuser', password: 'password123' };
      db.query.mockRejectedValue(new Error('Registration error')); // Simulate DB error

      const response = await request(app)
        .post('/register')
        .send(newUser);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to register user.');
    });
  });

  // Test for PUT /api/profile/accounts/:no_user
  describe('PUT /api/profile/accounts/:no_user', () => {
    it('should update the user profile and return status 200', async () => {
      const updatedUser = { username: 'updateduser', password: 'newpassword123' };
      const mockUser = { no_user: '123', profil_url: 'old_profile.jpg' };

      db.query.mockResolvedValue([mockUser]);  // Mock existing user
      db.query.mockResolvedValue([{}]);  // Mock successful update

      const response = await request(app)
        .put('/api/profile/accounts/123')
        .send(updatedUser);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User updated successfully!');
    });

    it('should return 404 if user to update does not exist', async () => {
      db.query.mockResolvedValue([[]]); // Simulate non-existing user

      const response = await request(app)
        .put('/api/profile/accounts/nonexistent_id')
        .send({ username: 'newuser' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found.');
    });

    it('should return 500 if there is an error updating the user', async () => {
      db.query.mockRejectedValue(new Error('Database error')); // Simulate DB error

      const response = await request(app)
        .put('/api/profile/accounts/123')
        .send({ username: 'erroruser' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update user.');
    });
  });

  // Test for DELETE /api/profile/accounts/:no_user
  describe('DELETE /api/profile/accounts/:no_user', () => {
    it('should delete a user and return status 200', async () => {
      const mockUser = { no_user: '123', profil_url: 'profile.jpg' };

      db.query.mockResolvedValue([mockUser]);  // Mock existing user
      db.query.mockResolvedValue([{}]);  // Mock successful deletion

      const unlinkMock = jest.spyOn(fs, 'unlink').mockImplementation((path, cb) => cb(null));

      const response = await request(app).delete('/api/profile/accounts/123');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully!');
      expect(unlinkMock).toHaveBeenCalledWith(
        path.join(__dirname, '../assets/profil_img', 'profile.jpg'), expect.any(Function)
      );
    });

    it('should return 404 if user to delete does not exist', async () => {
      db.query.mockResolvedValue([[]]);  // Simulate non-existing user

      const response = await request(app).delete('/api/profile/accounts/nonexistent_id');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found.');
    });

    it('should handle errors during deletion gracefully', async () => {
      db.query.mockRejectedValue(new Error('Deletion error')); // Simulate DB error

      const response = await request(app).delete('/api/profile/accounts/123');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete user. Please try again.');
    });
  });
});