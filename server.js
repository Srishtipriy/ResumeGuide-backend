
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const analysisRoutes = require("./routes/analysisRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Allow local frontend and deployed frontend
const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.send("ResumeGuide Backend is running!");
});

// Connect to MongoDB before handling API requests.
// The db.js module caches the connection for warm instances.
app.use("/api", async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("Database connection failed:", error.message);
        res.status(503).json({
            message: "Database connection failed. Please try again later."
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/analysis", analysisRoutes);

// Optional development endpoint
const { testGemini } = require("./controllers/resumeController");
app.get("/api/test-gemini", testGemini);

const { protectedRoute } = require("./controllers/analysisController");
const authMiddleware = require("./middleware/authMiddleware");
app.get("/api/protected", authMiddleware, protectedRoute);

// Start a local server only during local development
if (require.main === module) {
    async function startServer() {
        try {
            await connectDB();

            app.listen(PORT, () => {
                console.log(`Server started on PORT : ${PORT}`);
            });
        } catch (error) {
            console.error("Server startup failed:", error.message);
            process.exit(1);
        }
    }

    startServer();
}

module.exports = app;
