const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

// ================== TOKENS ==================
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const SPORTMONKS_API_KEY = process.env.SPORTMONKS_API_KEY;

// ================== BOT ==================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ================== STATE ==================
const AI_USERS = new Set();

// ================== UTILS ==================
function cleanText(text = "") {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/`/g, "")
    .replace(/\[/g, "")
    .replace(/\]/g, "");
}

// ================== AI ==================
async function askAI(question) {
  try {
    const prompt = `
أنت محلل كرة قدم محترف.
إذا لم تكن متأكدًا قل ذلك.
حلل السؤال التالي:

${question}
`;
    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodeURIComponent(prompt)}`
    );
    const data = await res.json();
    return cleanText(data.response || "❌ لا يوجد تحليل");
  } catch {
    return "⚠️ التحليل غير متاح الآن";
  }
}

// ================== API-FOOTBALL ==================
async function getTodayMatches() {
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?date=${today}`,
    { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
  );
  const data = await res.json();
  return data.response.slice(0, 6);
}

async function getStandings() {
  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=39&season=2024`,
    { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
  );
  const data = await res.json();
  return data.response[0].league.standings[0].slice(0, 5);
}

// ================== SPORTMONKS ==================
async function getSportmonksPredictions() {
  try {
    const res = await fetch(
      "https://api.sportmonks.com/v3/football/fixtures?include=predictions",
      {
        headers: {
          Authorization: SPORTMONKS_API_KEY
        }
      }
    );
    const data = await res.json();
    return data.data.slice(0, 3);
  } catch {
    return [];
  }
}

// ================== START ==================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "⚽ مرحبًا بك في محلل كرة القدم الذكي", {
    reply_markup: {
      keyboard: [
        ["📅 مباريات اليوم", "📊 ترتيب الدوري"],
        ["🔮 توقعات المباريات", "🤖 تحليل رياضي"],
        ["❌ إيقاف التحليل"]
      ],
      resize_keyboard: true
    }
  });
});

// ================== HANDLER ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // مباريات اليوم
  if (text === "📅 مباريات اليوم") {
    const matches = await getTodayMatches();
    let reply = "📅 مباريات اليوم:\n\n";
    matches.forEach(m => {
      reply += `${m.teams.home.name} vs ${m.teams.away.name}\n`;
    });
    return bot.sendMessage(chatId, reply);
  }

  // ترتيب الدوري
  if (text === "📊 ترتيب الدوري") {
    const table = await getStandings();
    let reply = "📊 ترتيب الدوري:\n\n";
    table.forEach(t => {
      reply += `${t.rank}. ${t.team.name} (${t.points} نقطة)\n`;
    });
    return bot.sendMessage(chatId, reply);
  }

  // توقعات SportMonks
  if (text === "🔮 توقعات المباريات") {
    const preds = await getSportmonksPredictions();
    if (preds.length === 0) {
      return bot.sendMessage(chatId, "⚠️ لا توجد توقعات متاحة الآن");
    }
    let reply = "🔮 توقعات المباريات:\n\n";
    preds.forEach(f => {
      reply += `${f.name}\n`;
    });
    return bot.sendMessage(chatId, reply);
  }

  // تشغيل التحليل
  if (text === "🤖 تحليل رياضي") {
    AI_USERS.add(chatId);
    return bot.sendMessage(chatId, "🤖 اكتب سؤالك الرياضي الآن");
  }

  // إيقاف التحليل
  if (text === "❌ إيقاف التحليل") {
    AI_USERS.delete(chatId);
    return bot.sendMessage(chatId, "🛑 تم إيقاف التحليل");
  }

  // ================== AI CHAT ==================
  if (AI_USERS.has(chatId)) {
    bot.sendChatAction(chatId, "typing");
    const answer = await askAI(text);
    return bot.sendMessage(chatId, answer, { parse_mode: undefined });
  }
});

console.log("✅ Bot is running...");
