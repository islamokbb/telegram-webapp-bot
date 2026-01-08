const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// ===== إعدادات =====
const token = process.env.TELEGRAM_TOKEN || "8579302087:AAHYaZr8wzEWEBjthbywSQvXgHocEL7GOww";
const ADMIN_ID = 7771891436;

const bot = new TelegramBot(token, { polling: true });

// ===== VIP =====
let VIP_USERS = new Set();

if (fs.existsSync("vip.json")) {
  const data = JSON.parse(fs.readFileSync("vip.json"));
  data.forEach(id => VIP_USERS.add(id));
}

function saveVIP() {
  fs.writeFileSync("vip.json", JSON.stringify([...VIP_USERS]));
}

// إضافة VIP
bot.onText(/\/addvip (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const userId = Number(match[1]);
  VIP_USERS.add(userId);
  saveVIP();

  bot.sendMessage(msg.chat.id, `✅ تم تفعيل VIP:\n${userId}`);
  bot.sendMessage(userId, "🎉 تم تفعيل VIP الخاص بك");
});

// حذف VIP
bot.onText(/\/removevip (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  VIP_USERS.delete(Number(match[1]));
  saveVIP();
  bot.sendMessage(msg.chat.id, "❌ تم حذف VIP");
});

// معرفة ID
bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, `🆔 ID الخاص بك:\n${msg.from.id}`);
});

// ===== ذكاء اصطناعي (elos-gemina) =====
async function askAI(text) {
  try {
    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    return data.response || "❌ لا يوجد رد";
  } catch {
    return "⚠️ حاول لاحقًا";
  }
}

// ===== START =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "⚽ مرحبًا، اختر:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 سترات", web_app: { url: "https://powercardx.com/" } }],
        [{ text: "🌐 موقع 2", web_app: { url: "https://powercardx.com/" } }],
        [{ text: "🌐 موقع 3", web_app: { url: "https://powercardx.com/" } }],
        [{ text: "🌐 موقع 4", web_app: { url: "https://powercardx.com/" } }],
        [{ text: "🤖 ذكاء اصطناعي", callback_data: "AI" }]
      ]
    }
  });
});

// ===== أزرار =====
bot.on("callback_query", (q) => {
  const chatId = q.message.chat.id;

  if (!VIP_USERS.has(q.from.id)) {
    bot.sendMessage(chatId, "🔒 هذه الخدمة VIP فقط");
    return;
  }

  if (q.data === "AI") {
    bot.sendMessage(chatId, "🤖 اكتب سؤالك:");

    bot.once("message", async (msg) => {
      const answer = await askAI(msg.text);
      bot.sendMessage(chatId, answer);
    });
  }
});

console.log("✅ Bot is running...");
