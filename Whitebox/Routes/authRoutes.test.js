const request = require('supertest');
const app = require('../../server'); // Pastikan ini merujuk pada file Express utama
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Menggunakan bcryptjs sesuai dengan penggunaan di aplikasi utama
require('dotenv').config(); // Pastikan .env dibaca

// Mock user for testing
const mockUser = {
  no_user: 1,
  username: 'zero',
  password: 'zero123', // Password sebelum di-hash (untuk keperluan tes)
  profil_url: '1737788902962.jpg'
};

// Hash the password before using it in the mock
const hashedPassword = bcrypt.hashSync(mockUser.password, 10);

// Log untuk melihat password asli dan password yang sudah di-hash
console.log('Original Password:', mockUser.password);
console.log('Hashed Password:', hashedPassword);

// Mock database query
jest.mock('../../db/db', () => ({
  query: jest.fn()
}));

const db = require('../../db/db');

// Mock environment variables directly in tests
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

describe('Auth Routes', () => {
  let accessToken, refreshToken;
  let server;

  beforeAll(() => {
    // Pastikan .env dibaca dengan benar
    console.log('JWT_SECRET in test:', process.env.JWT_SECRET);
    console.log('REFRESH_TOKEN_SECRET in test:', process.env.REFRESH_TOKEN_SECRET);
    if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('Missing JWT_SECRET or REFRESH_TOKEN_SECRET');
    }
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks setelah setiap test
  });

  afterAll((done) => {
    if (server) {
      server.close(done); // Pastikan server ditutup setelah pengujian selesai
    } else {
      done(); // Ensure the callback is called if there's no server to close
    }
  }, 10000); // Increased timeout to 10 seconds
  

  // 1️⃣ Test Login
  it('seharusnya login berhasil dengan kredensial yang valid', async () => {
    // Mock database response dengan password yang sudah di-hash
    db.query.mockResolvedValueOnce([[{
      ...mockUser,
      password: hashedPassword // Gunakan password yang sudah di-hash
    }]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'zero', password: 'zero123' }); // Password dalam bentuk plain text

    // Verifikasi respons
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.username).toBe('zero');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;

    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
  });

  it('seharusnya gagal login dengan kredensial yang tidak valid', async () => {
    // Mock user not found
    db.query.mockResolvedValueOnce([]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'wronguser', password: 'wrongpass' });

    // Verifikasi respons
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Username not found');

    console.log('Login Failure Response:', res.body);
  });

  // 2️⃣ Test Refresh Token
  it('seharusnya berhasil merefresh token akses', async () => {
    // Ensure the login test has been completed and refreshToken is set
    if (!refreshToken) {
      throw new Error('Refresh token is missing. Ensure login test passes first.');
    }

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    // Verify the response
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    console.log('Refreshed Access Token:', res.body.accessToken);
  });

  it('should fail refresh with invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalidtoken' });

    // Verifikasi respons
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Refresh token is invalid or missing');
    console.log('Refresh Failure Response:', res.body);
  });

  // 3️⃣ Test Protected Route
  it('seharusnya dapat mengakses rute terenkripsi dengan token yang valid', async () => {
    const validAccessToken = jwt.sign(
      { no_user: 1, username: 'zero' },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get('/api/auth/protected')
      .set('Authorization', `Bearer ${validAccessToken}`);

    // Verifikasi respons
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('This is a protected route!');
    console.log('Protected Route Access Response:', res.body);
  });

  it('seharusnya gagal mengakses rute terenkripsi tanpa token', async () => {
    const res = await request(app)
      .get('/api/auth/protected'); // Pastikan endpointnya benar

    // Verifikasi respons
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Authorization header is missing');
    console.log('Protected Route Failure Response:', res.body);
  });

  // 4️⃣ Test Logout
  it('seharusnya logout berhasil', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    // Verifikasi respons
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Successfully logged out');
    console.log('Logout Response:', res.body);
  });

  // 5️⃣ Test JWT Signing and Verification
  it('seharusnya dapat menandatangani dan memverifikasi JWT dengan benar', () => {
    const payload = { no_user: 1, username: 'zero' };

    // Membuat token
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Memverifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.username).toBe('zero');
  });
});
