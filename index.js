require("dotenv").config();

const app = require("./app");
const connectDB = require("./Config/Db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`🚀 Dhanus Backend running on port ${PORT}`);
        });
    } catch (error) {
        console.error(
            "❌ Server startup failed:",
            error.message
        );
    }
};

startServer();