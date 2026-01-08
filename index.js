const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const token = process.env.TELEGRAM_TOKEN;
const HF_TOKEN = process.env.HF_TOKEN;
const ADMIN_ID = 7771891436; // ID تاعك

const bot = new TelegramBot(token, { polling: true });

// تحميل VIP من الملف
let VIP_USERS = new Set();
if (fs.existsSync("vip.json")) {
  const data = JSON.parse(fs.readFileSync("vip.json"));
  data.forEach(id => VIP_USERS.add(id));
}

// حفظ VIP
function saveVIP() {
  fs.writeFileSync("vip.json", JSON.stringify([...VIP_USERS]));
}

// إضافة VIP
bot.onText(/\/addvip (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const userId = Number(match[1]);
  VIP_USERS.add(userId);
  saveVIP();

  bot.sendMessage(msg.chat.id, `✅ تم تفعيل VIP للمستخدم:\n${userId}`);
  bot.sendMessage(userId, "🎉 تم تفعيل اشتراك VIP الخاص بك!");
});

// حذف VIP (اختياري)
bot.onText(/\/removevip (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  VIP_USERS.delete(Number(match[1]));
  saveVIP();
  bot.sendMessage(msg.chat.id, "❌ تم حذف VIP.");
});

// معرفة ID
bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, `🆔 ID الخاص بك:\n${msg.from.id}`);
});

// AI
async function askAI(question) {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: `أنت محلل كرة قدم فقط.\nالسؤال: ${question}`
      })
    }
  );
  const data = await res.json();
  return data[0]?.generated_text || "حاول لاحقًا.";
}

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "⚽ مرحبًا\nاختر:", {
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

// أزرار
bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;

  if (!VIP_USERS.has(q.from.id)) {
    return bot.sendMessage(chatId,
      "🔒 هذه الخدمة VIP فقط\n📩 أرسل ID للإدارة للتفعيل."
    );
  }

  if (q.data === "AI") {
    bot.sendMessage(chatId, "🤖 اكتب سؤالك:");
    bot.once("message", async (msg) => {
      const answer = await askAI(msg.text);
      bot.sendMessage(chatId, answer);
    });
  }
});
