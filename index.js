const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

// ================== ENV ==================
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 7771891436; // ايديك

// ================== BOT ==================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ================== STATE ==================
const USER_STATE = new Map(); // ANALYSIS | PREDICTION
let TODAY_PAPERS = [];

// ================== UTILS ==================
function cleanText(text = "") {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/`/g, "");
}

// ================== AI ==================
async function askAI(prompt) {
  try {
    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodeURIComponent(prompt)}`
    );
    const data = await res.json();
    return cleanText(data.response || "❌ لا يوجد رد");
  } catch {
    return "⚠️ الذكاء الاصطناعي غير متاح الآن";
  }
}

// ================== START ==================
bot.onText(/\/start/, (msg) => {
  const keyboard = [
    ["🤖 تحليل رياضي AI", "🎯 توقع رياضي AI"],
    ["📰 أوراق اليوم"],
    ["❌ إيقاف التحليل"]
  ];

  // زر مخفي للأدمن
  if (msg.from.id === ADMIN_ID) {
    keyboard.push(["🔐 لوحة التحكم"]);
  }

  bot.sendMessage(msg.chat.id, "⚽ مرحبًا بك في POWERCARDX", {
    reply_markup: {
      keyboard,
      resize_keyboard: true
    }
  });
});

// ================== MESSAGE HANDLER ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // ===== تحليل رياضي =====
  if (text === "🤖 تحليل رياضي AI") {
    USER_STATE.set(chatId, "ANALYSIS");
    return bot.sendMessage(chatId, "🧠 اكتب اسم المباراة للتحليل");
  }

  // ===== توقع رياضي =====
  if (text === "🎯 توقع رياضي AI") {
    USER_STATE.set(chatId, "PREDICTION");
    return bot.sendMessage(chatId, "🎯 اكتب اسم المباراة للتوقع");
  }

  // ===== أوراق اليوم =====
  if (text === "📰 أوراق اليوم") {
    if (TODAY_PAPERS.length === 0) {
      return bot.sendMessage(chatId, "📭 لا توجد أوراق اليوم");
    }
    return bot.sendMessage(chatId, "📰 أوراق اليوم:\n\n" + TODAY_PAPERS.join("\n"));
  }

  // ===== لوحة تحكم مخفية =====
  if (text === "🔐 لوحة التحكم" && msg.from.id === ADMIN_ID) {
    return bot.sendMessage(chatId,
      "🛠 لوحة التحكم:\n\n" +
      "✏️ اكتب:\n/add فوز ريال مدريد\n/add فوز برشلونة\n\n🗑 /clear لمسح الأوراق"
    );
  }

  // ===== إضافة أوراق (أدمن) =====
  if (text.startsWith("/add ") && msg.from.id === ADMIN_ID) {
    const paper = text.replace("/add ", "");
    TODAY_PAPERS.push("• " + paper);
    return bot.sendMessage(chatId, "✅ تم إضافة الرهان");
  }

  if (text === "/clear" && msg.from.id === ADMIN_ID) {
    TODAY_PAPERS = [];
    return bot.sendMessage(chatId, "🗑 تم مسح أوراق اليوم");
  }

  // ===== إيقاف =====
  if (text === "❌ إيقاف التحليل") {
    USER_STATE.delete(chatId);
    return bot.sendMessage(chatId, "🛑 تم الإيقاف");
  }

  // ================== AI CHAT ==================
  const mode = USER_STATE.get(chatId);

  if (mode === "ANALYSIS") {
    bot.sendChatAction(chatId, "typing");
    const prompt = `
أنت محلل كرة قدم محترف.
حلل المباراة التالية تحليلًا مختصرًا:
- الأداء
- نقاط القوة والضعف
- أفضلية الفوز

المباراة: ${text}
`;
    const answer = await askAI(prompt);
    return bot.sendMessage(chatId, answer);
  }

  if (mode === "PREDICTION") {
    bot.sendChatAction(chatId, "typing");
    const prompt = `
أنت محلل رهانات كرة قدم.
أعطني توقعًا ذكيًا للمباراة التالية مع نسب تقريبية:

- الفائز
- الشوط الأول
- الركنيات
- البطاقات الصفراء
- التسديدات
- الأخطاء

المباراة: ${text}
`;
    const answer = await askAI(prompt);
    return bot.sendMessage(chatId, answer);
  }
});

console.log("✅ Bot is running");
