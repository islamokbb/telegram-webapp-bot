const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");
const fs = require("fs");

// 🔴 توكن البوت (مؤقتًا هنا – لاحقًا حطه في Railway Variables)
const token = "8579302087:AAHYaZr8wzEWEBjthbywSQvXgHocEL7GOww";

// 🔴 ID تاعك (الإدارة)
const ADMIN_ID = 7771891436;

const bot = new TelegramBot(token, { polling: true });

/* =========================
   VIP SYSTEM (ملف vip.json)
========================= */

// تحميل VIP من الملف
let VIP_USERS = new Set();
if (fs.existsSync("vip.json")) {
  const data = JSON.parse(fs.readFileSync("vip.json", "utf8"));
  data.forEach(id => VIP_USERS.add(id));
}

// حفظ VIP
function saveVIP() {
  fs.writeFileSync("vip.json", JSON.stringify([...VIP_USERS], null, 2));
}

// إضافة VIP (أنت فقط)
bot.onText(/\/addvip (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const userId = Number(match[1]);
  VIP_USERS.add(userId);
  saveVIP();

  bot.sendMessage(msg.chat.id, `✅ تم تفعيل VIP للمستخدم:\n${userId}`);
  bot.sendMessage(userId, "🎉 تم تفعيل اشتراك VIP الخاص بك بنجاح!");
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

/* =========================
   AI (elos-gemina) — نفس Python
========================= */

async function askAI(text) {
  try {
    const encodedText = encodeURIComponent(text);
    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodedText}`
    );

    if (!res.ok) {
      return "❌ السيرفر لا يرد، حاول لاحقًا";
    }

    const data = await res.json();
    return data.response || "⚠️ ما كاش رد";
  } catch (err) {
    return "❌ خطأ في الاتصال بالذكاء الاصطناعي";
  }
}

/* =========================
   /start + MENU
========================= */

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "⚽ مرحبًا بك\nاختر من القائمة:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 سترات", web_app: { url: "https://powercardx.com/" } }],
          [{ text: "🌐 موقع 2", web_app: { url: "https://powercardx.com/" } }],
          [{ text: "🌐 موقع 3", web_app: { url: "https://powercardx.com/" } }],
          [{ text: "🌐 موقع 4", web_app: { url: "https://powercardx.com/" } }],
          [{ text: "🤖 ذكاء اصطناعي", callback_data: "AI" }]
        ]
      }
    }
  );
});

/* =========================
   BUTTON HANDLER
========================= */

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;

  // تحقق VIP
  if (!VIP_USERS.has(q.from.id)) {
    return bot.sendMessage(
      chatId,
      "🔒 هذه الخدمة VIP فقط\n📩 أرسل ID للإدارة للتفعيل."
    );
  }

  // زر الذكاء الاصطناعي
  if (q.data === "AI") {
    bot.sendMessage(chatId, "🤖 اكتب سؤالك:");
    bot.once("message", async (msg) => {
      const answer = await askAI(msg.text);
      bot.sendMessage(chatId, answer);
    });
  }
});

console.log("🤖 Bot is running...");
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
