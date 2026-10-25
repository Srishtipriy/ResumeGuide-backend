require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const analysisRoutes = require("./routes/analysisRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: [
        "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.send("ResumeGuide Backend is running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/analysis", analysisRoutes);

// Gemini connectivity check only (optional development endpoint)
const { testGemini } = require("./controllers/resumeController");
app.get("/api/test-gemini", testGemini);

const { protectedRoute } = require("./controllers/analysisController");
const authMiddleware = require("./middleware/authMiddleware");
app.get("/api/protected", authMiddleware, protectedRoute);

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
