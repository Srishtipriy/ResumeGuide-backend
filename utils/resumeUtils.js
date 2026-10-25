const path = require("path");
require("pdf-parse/worker");
const { ObjectId } = require("mongodb");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

function validId(id) {
    return typeof id === "string" && ObjectId.isValid(id);
}

async function extractTextFromResume(buffer, extension) {
    if (extension === ".pdf") {
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            return result.text;
        } finally {
            await parser.destroy();
        }
    }

    if (extension === ".docx") {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    return "";
}

function getResumeContentType(fileName) {
    return fileName.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

module.exports = {
    path,
    validId,
    extractTextFromResume,
    getResumeContentType
};
