const TelegramBot = require("node-telegram-bot-api");


// ================== ENV ==================
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 7771891436;

// ================== SECRET ==================
const SECRET_COMMAND =
"/0xd334e5edfd2876fcb5e0cd14c50afaf0fd8d0a880xd334e5edfd2876fcb5e0cd14c50afaf0fd8d0a88";

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
  bot.sendMessage(msg.chat.id, "⚽ مرحبًا بك في POWERCARDX", {
    reply_markup: {
      keyboard: [
        ["🤖 تحليل رياضي AI", "🎯 توقع رياضي AI"],
        ["📰 أوراق اليوم"],
        ["❌ إيقاف التحليل"]
      ],
      resize_keyboard: true
    }
  });
});

// ================== MESSAGE HANDLER ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // ===== SECRET ADMIN PANEL =====
  if (text === SECRET_COMMAND && msg.from.id === ADMIN_ID) {
    return bot.sendMessage(chatId,
      "🔐 لوحة التحكم السرّية\n\n" +
      "✏️ إضافة ورقة:\n/add فوز ريال مدريد\n/add أكثر من 8.5 ركنيات\n\n" +
      "🗑 مسح جميع الأوراق:\n/clear"
    );
  }

  // ===== ADD PAPER (ADMIN) =====
  if (text.startsWith("/add ") && msg.from.id === ADMIN_ID) {
    const paper = text.replace("/add ", "").trim();
    if (!paper) return;
    TODAY_PAPERS.push("• " + paper);
    return bot.sendMessage(chatId, "✅ تم إضافة الرهان");
  }

  // ===== CLEAR PAPERS (ADMIN) =====
  if (text === "/clear" && msg.from.id === ADMIN_ID) {
    TODAY_PAPERS = [];
    return bot.sendMessage(chatId, "🗑 تم مسح أوراق اليوم");
  }

  // ===== ANALYSIS MODE =====
  if (text === "🤖 تحليل رياضي AI") {
    USER_STATE.set(chatId, "ANALYSIS");
    return bot.sendMessage(chatId, "🧠 اكتب اسم المباراة للتحليل");
  }

  // ===== PREDICTION MODE =====
  if (text === "🎯 توقع رياضي AI") {
    USER_STATE.set(chatId, "PREDICTION");
    return bot.sendMessage(chatId, "🎯 اكتب اسم المباراة للتوقع");
  }

  // ===== TODAY PAPERS =====
  if (text === "📰 أوراق اليوم") {
    if (TODAY_PAPERS.length === 0) {
      return bot.sendMessage(chatId, "📭 لا توجد أوراق اليوم");
    }
    return bot.sendMessage(chatId, "📰 أوراق اليوم:\n\n" + TODAY_PAPERS.join("\n"));
  }

  // ===== STOP =====
  if (text === "❌ إيقاف التحليل") {
    USER_STATE.delete(chatId);
    return bot.sendMessage(chatId, "🛑 تم إيقاف التحليل");
  }

  // ================== AI CHAT ==================
  const mode = USER_STATE.get(chatId);

  if (mode === "ANALYSIS") {
    bot.sendChatAction(chatId, "typing");
    const prompt = `
أنت محلل كرة قدم محترف.
حلل المباراة التالية باختصار:
- القوة
- الضعف
- من الأقرب للفوز

المباراة: ${text}
`;
    const answer = await askAI(prompt);
    return bot.sendMessage(chatId, answer);
  }

  if (mode === "PREDICTION") {
    bot.sendChatAction(chatId, "typing");
    const prompt = `
أنت محلل رهانات كرة قدم.
أعطني توقعًا ذكيًا مع نسب تقريبية:

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

console.log("✅ Bot is running...");
