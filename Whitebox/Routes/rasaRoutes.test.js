const request = require('supertest');
const app = require('../../server'); // Ensure it points to your main Express file
require('dotenv').config({ path: '../../.env' }); // Ensure .env is loaded correctly

// Mock Rasa server URL for testing
const rasaUrl = process.env.RASA_URL || 'http://localhost:5005'; // Ensure URL matches your setup in server.js

describe('Rasa Routes', () => {
  let server;

  afterAll((done) => {
    if (server) {
      server.close(done); // Ensure server is closed after tests
    } else {
      done();
    }
  }, 10000); // Increased timeout to 10 seconds for cleanup

  // Increase default timeout for all tests
  jest.setTimeout(10000); // 10 seconds timeout for all tests

  // 1️⃣ Test Start Rasa Server
  it('seharusnya berhasil menyalakan server Rasa', async () => {
    const res = await request(app)
      .post('/api/rasa/start');

    // Adding a delay before checking the response
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Rasa server started successfully.');
    console.log('Rasa Start Response:', res.body);
  });

  // 3️⃣ Test Restart Rasa Server
  it('seharusnya berhasil merestart server Rasa', async () => {
    const res = await request(app)
      .post('/api/rasa/restart');

    // Adding a delay before checking the response
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Rasa server restarted successfully.');
    console.log('Rasa Restart Response:', res.body);
  });

  // 4️⃣ Test Stop Rasa Server
  it('seharusnya berhasil mematikan server Rasa', async () => {
    const res = await request(app)
      .post('/api/rasa/stop');

    // Adding a delay before checking the response
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Rasa server stopped successfully.');
    console.log('Rasa Stop Response:', res.body);
  });
});
