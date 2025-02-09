const request = require('supertest');
const app = require('../../server'); // Pastikan ini mengarah ke server Express utama
require('dotenv').config(); // Load variabel lingkungan

describe('Rasa Routes (Hosted on Railway)', () => {
  let server;

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  jest.setTimeout(10000); // Timeout untuk setiap test (10 detik)

  // 1️⃣ Test Koneksi ke Rasa
  it('seharusnya berhasil terhubung ke Rasa di Railway', async () => {
    const res = await request(app)
      .get('/api/rasa/status'); // Pastikan ada endpoint ini di backend

    expect(res.statusCode).toBe(200);
    expect(res.body.state).toBe('running');
    console.log('Rasa Status Response:', res.body);
  });

  // 2️⃣ Test Kirim Pesan ke Rasa
  it('seharusnya berhasil mengirim pesan dan menerima respons dari Rasa', async () => {
    const res = await request(app)
      .post('/api/rasa/message')
      .send({
        "sender": "halo",
        "message": "daftar ruangan" 
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('response'); // Pastikan ada respons
    console.log('Rasa Message Response:', res.body);
  });
});
