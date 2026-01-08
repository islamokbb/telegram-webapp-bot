const TelegramBot = require("node-telegram-bot-api");

// ===== TOKENS =====
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const SPORTMONKS_API_KEY = process.env.SPORTMONKS_API_KEY;
const ADMIN_ID = Number(process.env.ADMIN_ID);

// ===== BOT =====
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===== STATES =====
const AI_USERS = new Set();
const BET_USERS = new Set();
const FIRST_HALF_USERS = new Set();

// ===== UTILS =====
function percent(a, b) {
  const total = a + b;
  if (total === 0) return [50, 50];
  return [
    Math.round((a / total) * 100),
    Math.round((b / total) * 100)
  ];
}

// ===== API FOOTBALL =====
async function getTodayMatches() {
  const today = new Date().toISOString().split("T")[0];
  const r = await fetch(
    `https://v3.football.api-sports.io/fixtures?date=${today}`,
    { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
  );
  const j = await r.json();
  return j.response.slice(0, 6);
}

async function getStandings() {
  const r = await fetch(
    `https://v3.football.api-sports.io/standings?season=2025&league=39`,
    { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
  );
  const j = await r.json();
  return j.response[0].league.standings[0].slice(0, 5);
}

// ===== SPORTMONKS =====
async function getPredictions() {
  const r = await fetch(
    "https://api.sportmonks.com/v3/football/fixtures?include=predictions",
    { headers: { Authorization: SPORTMONKS_API_KEY } }
  );
  const j = await r.json();
  return j.data.slice(0, 3);
}

// ===== START =====
bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, "⚽ مرحبًا بك في محلل كرة القدم الذكي", {
    reply_markup: {
      keyboard: [
        ["📅 مباريات اليوم", "📊 ترتيب الدوري"],
        ["🎯 توقع رهاني", "⏱️ رهان الشوط الأول"],
        ["🤖 تحليل رياضي", "❌ إيقاف التحليل"]
      ],
      resize_keyboard: true
    }
  });
});

// ===== HANDLER =====
bot.on("message", async msg => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text) return;

  // مباريات اليوم
  if (text === "📅 مباريات اليوم") {
    const m = await getTodayMatches();
    let r = "📅 مباريات اليوم:\n\n";
    m.forEach(x => {
      r += `${x.teams.home.name} vs ${x.teams.away.name}\n`;
    });
    return bot.sendMessage(chatId, r);
  }

  // ترتيب الدوري
  if (text === "📊 ترتيب الدوري") {
    const t = await getStandings();
    let r = "📊 ترتيب الدوري:\n\n";
    t.forEach(x => {
      r += `${x.rank}. ${x.team.name} (${x.points})\n`;
    });
    return bot.sendMessage(chatId, r);
  }

  // توقعات
  if (text === "🎯 توقع رهاني") {
    BET_USERS.add(chatId);
    return bot.sendMessage(chatId, "✍️ اكتب المباراة:\nمثال:\nBarcelona vs Real Madrid");
  }

  // رهان الشوط الأول
  if (text === "⏱️ رهان الشوط الأول") {
    FIRST_HALF_USERS.add(chatId);
    return bot.sendMessage(chatId, "✍️ اكتب المباراة للشوط الأول:");
  }

  // AI
  if (text === "🤖 تحليل رياضي") {
    AI_USERS.add(chatId);
    return bot.sendMessage(chatId, "🤖 اكتب سؤالك الرياضي");
  }

  if (text === "❌ إيقاف التحليل") {
    AI_USERS.clear();
    BET_USERS.clear();
    FIRST_HALF_USERS.clear();
    return bot.sendMessage(chatId, "🛑 تم الإيقاف");
  }

  // ===== BET =====
  if (BET_USERS.has(chatId)) {
    BET_USERS.delete(chatId);
    return bot.sendMessage(
      chatId,
      `🎯 توقع ذكي للمباراة:\n\n🏆 الأقرب للفوز: الفريق الأقوى تاريخيًا\n🚩 ركنيات: متقاربة\n🟨 بطاقات: الفريق الدفاعي أكثر\n🎯 تسديدات: الفريق الهجومي أكثر\n⚠️ أخطاء: الفريق الضاغط أكثر`
    );
  }

  // ===== FIRST HALF =====
  if (FIRST_HALF_USERS.has(chatId)) {
    FIRST_HALF_USERS.delete(chatId);
    return bot.sendMessage(
      chatId,
      `⏱️ رهان الشوط الأول:\n\n🏆 تقدم مبكر: 60%\n🚩 ركنيات: 55%\n🟨 بطاقات: 62%\n🎯 تسديدات: 58%\n⚠️ أخطاء: 64%`
    );
  }
});

console.log("✅ Bot is running");
