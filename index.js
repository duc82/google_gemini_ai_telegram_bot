require("dotenv").config();
const { Telegraf, session } = require("telegraf");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");

const token = process.env.TELEGRAM_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

const bot = new Telegraf(token);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const httpServer = http.createServer();

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig,
});

bot.use(
  session({
    defaultSession: () => ({ history: [] }),
  })
);

// /start
bot.start(async (ctx) => {
  const user = ctx.from.first_name;
  const username = ctx.from.username;
  return await ctx.reply(`
Hello ${user} (@${username})! I'm a bot that uses Google's Generative AI to chat with you. Send me a message and I'll respond to you.
    `);
});

bot.on("message", async (ctx) => {
  const text = ctx.message.text;

  if (!text) {
    return;
  }

  if (text?.startsWith("/")) {
    return;
  }

  const history = ctx.session.history;

  const chat = model.startChat({ history });

  const result = await chat.sendMessage(text);
  const response = result.response.text();

  const newHistory = await chat.getHistory();

  ctx.session.history = newHistory;

  return ctx.reply(response);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

const port = process.env.PORT || 5000;

httpServer.listen(port, () => {
  bot.launch();
  console.log(`Server is running on port ${port}`);
  console.log("google_gemini_ai_telegram_bot is running");
});
