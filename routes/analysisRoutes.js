const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
    analyzeResume,
    getAnalysisHistory,
    deleteAnalysis,
    getAnalysisById,
} = require("../controllers/analysisController");

const router = express.Router();

router.post("/analyze", authMiddleware, analyzeResume);
router.get("/history", authMiddleware, getAnalysisHistory);
router.delete("/:id", authMiddleware, deleteAnalysis);
router.get("/:id", authMiddleware, getAnalysisById);

module.exports = router;
