const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { getDB } = require("../config/db");
const {
    extractTextFromResume,
    validId,
    getResumeContentType
} = require("../utils/resumeUtils");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function uploadResume(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a resume" });
        }

        const fileName = req.file.originalname;
        const extension = path.extname(fileName).toLowerCase();
        const extractedText = await extractTextFromResume(req.file.buffer, extension);

        if (!extractedText || !extractedText.trim()) {
            return res.status(400).json({
                message: "Could not extract text from this resume. Please use a text-based PDF or DOCX."
            });
        }

        const result = await getDB().collection("resumes").insertOne({
            userId: req.user.id,
            fileName,
            extractedText,
            fileData: req.file.buffer,
            createdAt: new Date()
        });

        return res.status(201).json({
            message: "Resume uploaded and text extracted successfully!",
            resumeId: result.insertedId.toString(),
            fileName,
            textLength: extractedText.length
        });
    } catch (error) {
        console.error("Resume upload error:", error.message);
        return res.status(500).json({ message: "Could not process resume" });
    }
}

async function getResumeFile(req, res) {
    try {
        const resumeId = req.params.id;
        if (!validId(resumeId)) {
            return res.status(400).json({ message: "Invalid resume ID" });
        }

        const file = await getDB().collection("resumes").findOne({
            _id: new (require("mongodb").ObjectId)(resumeId),
            userId: req.user.id
        });

        if (!file) {
            return res.status(404).json({ message: "Resume not found" });
        }
        if (!file.fileData) {
            return res.status(404).json({ message: "Resume file not available" });
        }

        res.setHeader("Content-Type", getResumeContentType(file.fileName));
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${path.basename(file.fileName)}"`
        );

        const fileBuffer = Buffer.isBuffer(file.fileData)
            ? file.fileData
            : Buffer.from(file.fileData.buffer || file.fileData);

        return res.send(fileBuffer);
    } catch (error) {
        console.error("Resume file fetch error:", error.message);
        return res.status(500).json({ message: "Failed to fetch resume" });
    }
}

async function testGemini(req, res) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: "Say hello in one short sentence."
        });
        return res.json({
            message: "Gemini is working!",
            response: response.text
        });
    } catch (error) {
        console.error("Gemini test error:", error.message);
        return res.status(500).json({
            message: "Gemini test failed",
            error: error.message
        });
    }
}

module.exports = { uploadResume, getResumeFile, testGemini };
