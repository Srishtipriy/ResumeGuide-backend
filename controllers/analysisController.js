const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { validId } = require("../utils/resumeUtils");
const { analyzeResumeWithAI } = require("../services/aiService");

async function analyzeResume(req, res) {
    try {
        const { resumeId, jobRole, jobDescription } = req.body || {};

        if (!validId(resumeId)) {
            return res.status(400).json({ message: "A valid resumeId is required" });
        }

        const resume = await getDB().collection("resumes").findOne({
            _id: new ObjectId(resumeId),
            userId: req.user.id
        });

        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        const resumeText = resume.extractedText;
        if (!resumeText) {
            return res.status(400).json({
                message: "No text could be extracted from this resume"
            });
        }

        const prompt = `
You are an expert professional resume analyzer and ATS specialist.
Analyze the resume carefully and return ONLY valid JSON.

RESUME:
${resumeText}

${jobRole ? `TARGET JOB ROLE:\n${jobRole}` : ""}

${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : ""}

Return JSON using this exact structure:
{
  "summary": "One short professional summary",
  "scores": { "ats": 0, "content": 0, "skills": 0 },
  "detectedSkills": [],
  "skillsYouCanLearn": [],
  "strengths": [],
  "formattingImprovements": [],
  "contentImprovements": [
    {
      "section": "Projects",
      "current": "Original resume content",
      "suggested": "Improved version without inventing facts",
      "reason": "Why this improvement helps"
    }
  ],
  "suggestions": [],
  "jobMatch": {
    "score": 0,
    "matchedSkills": [],
    "skillsYouCanLearn": [],
    "suggestions": []
  }
}

Rules:
1. All scores must be integers from 0 to 100.
2. Evaluate ATS readability, structure, keywords and formatting.
3. Evaluate content clarity, projects, achievements and action verbs.
4. Evaluate technical skills, tools and technologies.
5. detectedSkills must only include skills present or strongly evidenced in the resume.
6. skillsYouCanLearn are recommendations, not claims about what the candidate does not know.
7. Check margins, spacing, alignment, fonts, headings, bullets, organization and readability.
8. Never invent experience, projects, certifications, achievements, technologies, numbers or impact.
9. For contentImprovements, use actual resume content and preserve its meaning.
10. When a target role or job description is supplied, calculate jobMatch score and provide relevant matched skills and suggestions.
11. If neither target role nor job description is supplied, set jobMatch to null.
12. Return only valid JSON, without Markdown or extra explanation.
`;

        let analysisText;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const aiText = await analyzeResumeWithAI(prompt);
                analysisText = typeof aiText === "string" ? aiText.trim() : "";
                break;
            } catch (error) {
                console.error(`Analysis attempt ${attempt} failed:`, error.message);
                if (attempt === 3 || error.status !== 503) throw error;
                await new Promise(resolve => setTimeout(resolve, attempt * 3000));
            }
        }

        analysisText = (analysisText || "")
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        let analysisData;
        try {
            analysisData = JSON.parse(analysisText);
        } catch {
            console.error("Invalid AI JSON response:", analysisText);
            return res.status(500).json({
                message: "AI returned an invalid analysis format"
            });
        }

        analysisData.targetRole = jobRole || null;
        const overallScore = analysisData.scores?.ats ?? null;

        const saveResult = await getDB().collection("analyses").insertOne({
            userId: req.user.id,
            resumeId: resume._id.toString(),
            jobRole: jobRole || null,
            jobDescription: jobDescription || null,
            overallScore,
            analysisText: JSON.stringify(analysisData),
            fileName: resume.fileName,
            createdAt: new Date()
        });

        return res.json({
            message: "Resume analyzed successfully!",
            analysisId: saveResult.insertedId.toString(),
            analysis: analysisData
        });
    } catch (error) {
        console.error("Resume analysis error:", error.message);
        return res.status(500).json({
            message: "AI analysis failed",
            error: error.message
        });
    }
}

async function getAnalysisHistory(req, res) {
    try {
        const analyses = await getDB().collection("analyses")
            .find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .toArray();

        return res.json({
            analyses: analyses.map(item => ({
                id: item._id.toString(),
                resume_id: item.resumeId,
                job_role: item.jobRole,
                overall_score: item.overallScore,
                analysis_text: item.analysisText,
                created_at: item.createdAt,
                file_name: item.fileName
            }))
        });
    } catch (error) {
        console.error("History fetch error:", error.message);
        return res.status(500).json({ message: "Could not fetch analysis history" });
    }
}

async function deleteAnalysis(req, res) {
    try {
        const analysisId = req.params.id;
        if (!validId(analysisId)) {
            return res.status(400).json({ message: "Invalid analysis ID" });
        }

        const result = await getDB().collection("analyses").deleteOne({
            _id: new ObjectId(analysisId),
            userId: req.user.id
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Analysis not found" });
        }
        return res.json({ message: "Analysis deleted successfully" });
    } catch (error) {
        console.error("Analysis delete error:", error.message);
        return res.status(500).json({ message: "Could not delete analysis" });
    }
}

async function getAnalysisById(req, res) {
    try {
        const analysisId = req.params.id;
        if (!validId(analysisId)) {
            return res.status(400).json({ message: "Invalid analysis ID" });
        }

        const item = await getDB().collection("analyses").findOne({
            _id: new ObjectId(analysisId),
            userId: req.user.id
        });

        if (!item) {
            return res.status(404).json({ message: "Analysis not found" });
        }

        let analysisData;
        try {
            analysisData = JSON.parse(item.analysisText);
        } catch {
            return res.status(500).json({ message: "Stored analysis has invalid JSON" });
        }

        analysisData.targetRole = item.jobRole || null;
        return res.json({
            analysisId: item._id.toString(),
            fileName: item.fileName,
            createdAt: item.createdAt,
            analysis: analysisData
        });
    } catch (error) {
        console.error("Single analysis fetch error:", error.message);
        return res.status(500).json({ message: "Could not fetch analysis" });
    }
}

function protectedRoute(req, res) {
    return res.json({
        message: "You accessed a protected route!",
        user: req.user
    });
}

module.exports = {
    analyzeResume,
    getAnalysisHistory,
    deleteAnalysis,
    getAnalysisById,
    protectedRoute
};
