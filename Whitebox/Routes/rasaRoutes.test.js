const request = require("supertest");
const app = require("../../app"); // ✅ Load app.js tanpa menjalankan server
const db = require("../../db/db"); // Sesuaikan dengan lokasi koneksi database

describe("Rasa Routes (Hosted on Railway)", () => {
    let server;

    // 🔹 Start server sebelum test, gunakan port dinamis
    beforeAll(async () => {
        server = app.listen(0);

        console.log("🚀 Memulai Rasa server...");
        const startRes = await request(app).post("/api/rasa/start");
        if (startRes.statusCode !== 200) {
            throw new Error("❌ Gagal memulai Rasa server!");
        }
        console.log("✅ Rasa berhasil dimulai.");

        console.log("⏳ Menunggu Rasa siap...");
        await waitForRasaReady();
        console.log("✅ Rasa siap, memulai tes...");
    });

    // 🔹 Tutup server & database setelah semua test selesai
    afterAll(async (done) => {
        if (server) {
            console.log("🛑 Menutup server...");
            await new Promise((resolve) => server.close(resolve)); // Pastikan server tertutup
        }
        if (db && db.end) {
            console.log("🛑 Menutup koneksi database...");
            await db.end();
        }

        console.log("✅ Semua proses ditutup dengan aman.");
        done();
    });

    jest.setTimeout(60000); // ⏳ Timeout 30 detik untuk setiap test

    // 🔥 Fungsi Helper: Menunggu Rasa Siap Sebelum Tes
    async function waitForRasaReady(retries = 15, delay = 5000) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await request(app).get("/api/rasa/status");
                if (res.body.state === "running") {
                    console.log("✅ Rasa sudah siap.");
                    return;
                }
            } catch (error) {
                console.warn(`⚠️ Gagal cek status Rasa: ${error.message}`);
            }

            console.log(`🔄 Rasa belum siap, mencoba lagi dalam ${delay / 1000} detik...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
        throw new Error("❌ Rasa tidak siap setelah beberapa percobaan.");
    }

    // ✅ 1️⃣ Test Koneksi ke Rasa
    it("seharusnya berhasil terhubung ke Rasa di Railway", async () => {
        const res = await request(app).get("/api/rasa/status");

        expect(res.statusCode).toBe(200);
        expect(res.body.state).toBe("running");
        console.log("✅ Rasa Status Response:", res.body);
    });

    // ✅ 2️⃣ Test Kirim Pesan ke Rasa
    it("seharusnya berhasil mengirim pesan dan menerima respons dari Rasa", async () => {
        const res = await request(app)
            .post("/api/rasa/message")
            .send({
                sender: "user",
                message: "halo",
            });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("response"); // Pastikan ada respons
        console.log("✅ Rasa Message Response:", res.body);
    });

    // ✅ 3️⃣ Test Restart Rasa Server (Gunakan Delay)
    it("seharusnya berhasil merestart Rasa server", async () => {
        const res = await request(app).post("/api/rasa/restart");

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Rasa server restarted successfully.");
        console.log("✅ Rasa Restart Response:", res.body);

        // Tunggu sampai Rasa benar-benar restart
        console.log("⏳ Menunggu Rasa siap setelah restart...");
        await waitForRasaReady();
    });

    // ✅ 4️⃣ Test Stop Rasa Server
    it("seharusnya berhasil menghentikan Rasa server", async () => {
        const res = await request(app).post("/api/rasa/stop");

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Rasa server stopped successfully.");
        console.log("✅ Rasa Stop Response:", res.body);
    });
});
