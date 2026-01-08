const TelegramBot = require("node-telegram-bot-api");


// ================== إعدادات ==================
const token = process.env.TELEGRAM_TOKEN;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;

const bot = new TelegramBot(token, { polling: true });

// ================== حالات المستخدم ==================
const AI_USERS = new Set();     // من فعّل التحليل
const USER_LANG = {};           // ar / en / fr

// ================== النصوص ==================
const TEXT = {
  ar: {
    welcome: "⚽ مرحبًا بك\nأنا محلل كرة قدم ذكي 🤖\nاختر من الأزرار 👇",
    ai_on: "🤖 تم تفعيل التحليل الرياضي\nاسألني بلا حدود ⚽",
    ai_off: "❌ تم إيقاف التحليل",
    help: "ℹ️ أنا محلل كرة قدم:\n- لاعبين\n- تحليل مباريات\n- توقعات",
    choose_lang: "🌍 اختر اللغة"
  },
  en: {
    welcome: "⚽ Welcome\nI am a football analyst 🤖",
    ai_on: "🤖 Football analysis activated",
    ai_off: "❌ Analysis stopped",
    help: "ℹ️ I analyze football: players, matches, tactics",
    choose_lang: "🌍 Choose language"
  },
  fr: {
    welcome: "⚽ Bienvenue\nJe suis analyste football 🤖",
    ai_on: "🤖 Analyse activée",
    ai_off: "❌ Analyse arrêtée",
    help: "ℹ️ Analyse football: joueurs, matchs, tactiques",
    choose_lang: "🌍 Choisir la langue"
  }
};

// ================== لوحة أزرار ثابتة ==================
function mainKeyboard() {
  return {
    keyboard: [
      ["🤖 تحليل رياضي"],
      ["🌍 اللغة", "ℹ️ مساعدة"],
      ["❌ إيقاف التحليل"]
    ],
    resize_keyboard: true
  };
}

// ================== AI (تحليل فقط) ==================
async function askAI(question) {
  try {
    const prompt = `
أنت محلل كرة قدم محترف فقط.
إذا لم تكن متأكدًا قل ذلك.
حلل السؤال التالي تحليلاً رياضيًا:

${question}
`;

    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodeURIComponent(prompt)}`
    );

    const data = await res.json();
    return data.response || "❌ لا يوجد تحليل";
  } catch {
    return "⚠️ التحليل غير متاح الآن";
  }
}

// ================== API-Football (لاعبين) ==================
async function getPlayerInfo(name) {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/players?search=${encodeURIComponent(name)}`,
      {
        headers: {
          "x-apisports-key": FOOTBALL_API_KEY
        }
      }
    );

    const data = await res.json();
    if (!data.response || data.response.length === 0) return null;

    const p = data.response[0];
    const s = p.statistics[0];

    return {
      name: p.player.name,
      age: p.player.age,
      nationality: p.player.nationality,
      position: p.player.position,
      team: s.team.name,
      league: s.league.name
    };
  } catch {
    return null;
  }
}

// ================== START ==================
bot.onText(/\/start/, (msg) => {
  USER_LANG[msg.chat.id] = "ar";
  bot.sendMessage(
    msg.chat.id,
    TEXT.ar.welcome,
    { reply_markup: mainKeyboard() }
  );
});

// ================== استقبال الرسائل ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const lang = USER_LANG[chatId] || "ar";

  if (!text) return;

  // تشغيل التحليل
  if (text === "🤖 تحليل رياضي") {
    AI_USERS.add(chatId);
    return bot.sendMessage(chatId, TEXT[lang].ai_on);
  }

  // إيقاف التحليل
  if (text === "❌ إيقاف التحليل") {
    AI_USERS.delete(chatId);
    return bot.sendMessage(chatId, TEXT[lang].ai_off);
  }

  // مساعدة
  if (text === "ℹ️ مساعدة") {
    return bot.sendMessage(chatId, TEXT[lang].help);
  }

  // تغيير اللغة
  if (text === "🌍 اللغة") {
    return bot.sendMessage(chatId, TEXT[lang].choose_lang, {
      reply_markup: {
        keyboard: [
          ["🇸🇦 العربية", "🇬🇧 English", "🇫🇷 Français"],
          ["🔙 رجوع"]
        ],
        resize_keyboard: true
      }
    });
  }

  // اختيار لغة
  if (text === "🇸🇦 العربية") USER_LANG[chatId] = "ar";
  if (text === "🇬🇧 English") USER_LANG[chatId] = "en";
  if (text === "🇫🇷 Français") USER_LANG[chatId] = "fr";

  if (["🇸🇦 العربية", "🇬🇧 English", "🇫🇷 Français", "🔙 رجوع"].includes(text)) {
    const l = USER_LANG[chatId] || "ar";
    return bot.sendMessage(chatId, TEXT[l].welcome, {
      reply_markup: mainKeyboard()
    });
  }

  // ================== التحليل الرياضي الحقيقي ==================
  if (AI_USERS.has(chatId)) {
    bot.sendChatAction(chatId, "typing");

    // 1️⃣ هل السؤال عن لاعب؟
    const player = await getPlayerInfo(text);
    if (player) {
      return bot.sendMessage(
        chatId,
        `👤 ${player.name}
🌍 الجنسية: ${player.nationality}
🎂 العمر: ${player.age}
📍 المركز: ${player.position}
🏟️ النادي: ${player.team}
🏆 الدوري: ${player.league}`
      );
    }

    // 2️⃣ تحليل AI
    const answer = await askAI(text);
    return bot.sendMessage(chatId, answer);
  }
});

console.log("✅ Football Analyst Bot is running...");
