const OpenAI = require("openai");
require("dotenv").config();

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

module.exports = deepseek;
