const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ====== STATE ======
const USER_STATE = new Map();

// ====== BETS STORAGE ======
const BETS_FILE = "bets.json";
if (!fs.existsSync(BETS_FILE)) fs.writeFileSync(BETS_FILE, JSON.stringify([]));

function saveBets(bets) {
  fs.writeFileSync(BETS_FILE, JSON.stringify(bets, null, 2));
}

function loadBets() {
  return JSON.parse(fs.readFileSync(BETS_FILE));
}

// ====== START ======
bot.onText(/\/start/, (msg) => {
  USER_STATE.set(msg.chat.id, "NONE");

  const keyboard = [
    ["🤖 تحليل رياضي AI", "🎯 توقع رياضي AI"],
    ["📰 أوراق اليوم"],
    ["❌ إيقاف التحليل"]
  ];

  // زر مخفي للأدمن فقط
  if (msg.chat.id === ADMIN_ID) {
    keyboard.unshift(["➕ إضافة رهانات"]);
  }

  bot.sendMessage(msg.chat.id, "⚽ مرحبًا بك", {
    reply_markup: {
      keyboard,
      resize_keyboard: true
    }
  });
});

// ====== HANDLER ======
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // ====== ADD BETS (ADMIN ONLY) ======
  if (text === "➕ إضافة رهانات" && chatId === ADMIN_ID) {
    USER_STATE.set(chatId, "ADD_BETS");
    return bot.sendMessage(
      chatId,
      "✍️ اكتب الرهانات (كل رهان في سطر):\n\nمثال:\nفوز ريال مدريد\nفوز برشلونة"
    );
  }

  // ====== SAVE BETS ======
  if (USER_STATE.get(chatId) === "ADD_BETS" && chatId === ADMIN_ID) {
    const lines = text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return bot.sendMessage(chatId, "⚠️ لم يتم إدخال أي رهان");
    }

    saveBets(lines);
    USER_STATE.set(chatId, "NONE");

    return bot.sendMessage(chatId, "✅ تم حفظ الرهانات بنجاح");
  }

  // ====== SHOW BETS ======
  if (text === "📰 أوراق اليوم") {
    const bets = loadBets();

    if (bets.length === 0) {
      return bot.sendMessage(chatId, "📭 لا توجد رهانات اليوم");
    }

    let reply = "📰 أوراق اليوم:\n\n";
    bets.forEach((b, i) => {
      reply += `${i + 1}. ${b}\n`;
    });

    return bot.sendMessage(chatId, reply);
  }

  // ====== STOP ======
  if (text === "❌ إيقاف التحليل") {
    USER_STATE.set(chatId, "NONE");
    return bot.sendMessage(chatId, "🛑 تم الإيقاف");
  }
});

console.log("✅ Bot is running...");
