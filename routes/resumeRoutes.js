const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {uploadResume,getResumeFile} = require("../controllers/resumeController");
const {analyzeResume} = require("../controllers/analysisController");
const router = express.Router();

router.post("/upload",authMiddleware, upload.single("resume"), uploadResume);
router.post("/analyze",authMiddleware,analyzeResume);

router.get("/:id/file",authMiddleware,getResumeFile);

module.exports = router;