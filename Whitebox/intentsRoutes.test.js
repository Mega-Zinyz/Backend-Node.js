const request = require('supertest');
const app = require('../app'); // Pastikan ini sesuai dengan file utama Express.js
const db = require('../db/db');

beforeAll(async () => {
    await db.query('DELETE FROM intents'); // Bersihkan database sebelum test
});

afterAll(async () => {
    await db.end(); // ✅ Pastikan koneksi database ditutup setelah test selesai
});

describe("Intent Routes API", () => {
    
    it("should create a new intent", async () => {
        const response = await request(app)
            .post("/api/intents")
            .send({ name: "greet", examples: "Hello, Hi, Hey" });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("message", "Intent saved successfully");
        expect(response.body).toHaveProperty("id");
    });

    it("should retrieve all intents", async () => {
        const response = await request(app).get("/api/intents");
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it("should update an intent", async () => {
        const newIntent = await request(app)
            .post("/api/intents")
            .send({ name: "update_test", examples: "Example text" });

        const intentId = newIntent.body.id;

        const response = await request(app)
            .put(`/api/intents/${intentId}`)
            .send({ name: "updated_intent", examples: "Updated example text" });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Intent updated successfully");
    });

    it("should delete an intent", async () => {
        const newIntent = await request(app)
            .post("/api/intents")
            .send({ name: "delete_test", examples: "Example text" });

        const intentId = newIntent.body.id;

        const response = await request(app).delete(`/api/intents/${intentId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Intent deleted successfully");
    });

});
