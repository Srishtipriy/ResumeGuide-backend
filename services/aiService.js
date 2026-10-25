require("dotenv").config();

const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const aiModel = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0,
});

async function analyzeResumeWithAI(prompt) {
  const response = await aiModel.invoke(prompt);

  if (typeof response.content === "string") {
    return response.content;
  }

  return response.content
    .map((item) => {
      return typeof item === "string"
        ? item
        : item.text || "";
    })
    .join("");
}

module.exports = { analyzeResumeWithAI };
