const mongoose = require("mongoose");
const dns = require("dns");

// Ensure SRV records for MongoDB Atlas resolve cleanly on Windows / Node.js
try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
    console.warn("Could not set custom DNS servers:", e.message);
}

const connectDB = async () => {
    try {
        console.log("🔄 Connecting to MongoDB...");

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log(
            `✅ MongoDB Connected: ${conn.connection.host}`
        );
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:");
        console.error(error);
        throw error;
    }
};

module.exports = connectDB;