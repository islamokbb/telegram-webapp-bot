const TelegramBot = require("node-telegram-bot-api");

// ===== TOKEN =====
const token = process.env.TELEGRAM_TOKEN || "8579302087:AAHYaZr8wzEWEBjthbywSQvXgHocEL7GOww";
const bot = new TelegramBot(token, { polling: true });

// ===== حالات المستخدم =====
const userState = {}; // ai / null
const userLang = {};  // ar / en / fr

// ===== نصوص حسب اللغة =====
const T = {
  ar: {
    welcome: "⚽ مرحبًا بك\nاختر الخدمة:",
    ai: "🤖 الذكاء الاصطناعي",
    ask: "✍️ اكتب سؤالك:",
    back: "🔙 رجوع"
  },
  en: {
    welcome: "⚽ Welcome\nChoose a service:",
    ai: "🤖 AI Assistant",
    ask: "✍️ Ask your question:",
    back: "🔙 Back"
  },
  fr: {
    welcome: "⚽ Bienvenue\nChoisissez un service:",
    ai: "🤖 Intelligence Artificielle",
    ask: "✍️ Écrivez votre question:",
    back: "🔙 Retour"
  }
};

// ===== ذكاء اصطناعي (elos-gemina) =====
async function askAI(text) {
  try {
    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    return data.response || "❌ No response";
  } catch (e) {
    return "⚠️ AI not available now";
  }
}

// ===== اختيار اللغة =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🌍 اختر اللغة / Choose language", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🇸🇦 العربية", callback_data: "lang_ar" }],
        [{ text: "🇬🇧 English", callback_data: "lang_en" }],
        [{ text: "🇫🇷 Français", callback_data: "lang_fr" }]
      ]
    }
  });
});

// ===== أزرار =====
bot.on("callback_query", (q) => {
  const chatId = q.message.chat.id;

  // اختيار اللغة
  if (q.data.startsWith("lang_")) {
    const lang = q.data.split("_")[1];
    userLang[chatId] = lang;

    bot.sendMessage(chatId, T[lang].welcome, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 Stats", web_app: { url: "https://powercardx.com/" } }],
          [{ text: "🌐 Website", web_app: { url: "https://powercardx.com/" } }],
          [{ text: T[lang].ai, callback_data: "AI" }]
        ]
      }
    });
  }

  // دخول وضع الذكاء الاصطناعي
  if (q.data === "AI") {
    userState[chatId] = "ai";
    const lang = userLang[chatId] || "ar";
    bot.sendMessage(chatId, T[lang].ask, {
      reply_markup: {
        inline_keyboard: [
          [{ text: T[lang].back, callback_data: "BACK" }]
        ]
      }
    });
  }

  // رجوع
  if (q.data === "BACK") {
    userState[chatId] = null;
    const lang = userLang[chatId] || "ar";
    bot.sendMessage(chatId, T[lang].welcome);
  }
});

// ===== استقبال الرسائل =====
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text) return;

  // إذا المستخدم في وضع AI
  if (userState[chatId] === "ai") {
    bot.sendChatAction(chatId, "typing");
    const answer = await askAI(msg.text);
    bot.sendMessage(chatId, answer);
  }
});

console.log("✅ Bot is running...");
