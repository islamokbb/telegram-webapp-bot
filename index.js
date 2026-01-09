const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

// ================== ENV ==================
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const SPORTMONKS_API_KEY = process.env.SPORTMONKS_API_KEY;

// ================== BOT ==================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ================== STATE ==================
const USER_STATE = new Map(); // PREDICTION
const SESSION = new Map();    // chatId -> { match }

// ================== AI ==================
async function askAI(prompt) {
  try {
    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodeURIComponent(prompt)}`
    );
    const data = await res.json();
    return data.response || "❌ لا يوجد رد";
  } catch {
    return "⚠️ الذكاء الاصطناعي غير متاح الآن";
  }
}

// ================== INTENT ==================
function detectIntent(text) {
  text = text.toLowerCase();

  if (text.includes("ركن") || text.includes("corner")) return "CORNERS";
  if (text.includes("بطاق") || text.includes("card")) return "CARDS";
  if (text.includes("تسديد") || text.includes("shot")) return "SHOTS";
  if (text.includes("خطأ") || text.includes("foul")) return "FOULS";
  if (text.includes("شوط")) return "HALF";
  if (text.includes("يفوز") || text.includes("فوز")) return "WINNER";
  if (text.includes("جيد") || text.includes("تمام")) return "COMMENT";

  return "GENERAL";
}

// ================== API-FOOTBALL ==================
async function getMatchData(matchName) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${today}&search=${encodeURIComponent(matchName)}`,
      { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
    );

    const data = await res.json();
    if (!data.response || data.response.length === 0) return null;

    const m = data.response[0];
    return {
      home: m.teams.home.name,
      away: m.teams.away.name,
      league: m.league.name
    };
  } catch {
    return null;
  }
}

// ================== SPORTMONKS ==================
async function getTeamStatsSportmonks(teamName) {
  try {
    const searchRes = await fetch(
      `https://api.sportmonks.com/v3/football/teams/search/${encodeURIComponent(teamName)}?api_token=${SPORTMONKS_API_KEY}`
    );
    const searchData = await searchRes.json();
    if (!searchData.data || !searchData.data.length) return null;

    const teamId = searchData.data[0].id;

    const statsRes = await fetch(
      `https://api.sportmonks.com/v3/football/teams/${teamId}?include=statistics&api_token=${SPORTMONKS_API_KEY}`
    );
    const statsData = await statsRes.json();

    return statsData.data?.statistics || null;
  } catch {
    return null;
  }
}

// ================== START ==================
bot.onText(/\/start/, (msg) => {
  USER_STATE.clear();
  SESSION.clear();

  bot.sendMessage(msg.chat.id, "⚽ مرحبًا بك في المحلل الرياضي الذكي", {
    reply_markup: {
      keyboard: [
        ["🎯 توقع رياضي AI"],
        ["❌ إيقاف التحليل"]
      ],
      resize_keyboard: true
    }
  });
});

// ================== MESSAGE ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text) return;

  // ===== START MODE =====
  if (text === "🎯 توقع رياضي AI") {
    USER_STATE.set(chatId, "PREDICTION");
    SESSION.delete(chatId);
    return bot.sendMessage(chatId, "✍️ اكتب اسم المباراة (مثال: Real Madrid vs Barcelona)");
  }

  // ===== STOP =====
  if (text === "❌ إيقاف التحليل") {
    USER_STATE.delete(chatId);
    SESSION.delete(chatId);
    return bot.sendMessage(chatId, "🛑 تم الإيقاف");
  }

  // ===== PREDICTION =====
  if (USER_STATE.get(chatId) === "PREDICTION") {
    bot.sendChatAction(chatId, "typing");

    const intent = detectIntent(text);
    let session = SESSION.get(chatId);

    // أول مرة: تحديد المباراة
    if (!session) {
      const match = await getMatchData(text);
      if (!match) {
        return bot.sendMessage(chatId, "❌ لم أجد مباراة اليوم بهذا الاسم");
      }

      SESSION.set(chatId, {
        match: `${match.home} vs ${match.away}`
      });

      return bot.sendMessage(
        chatId,
        `⚽ تم تحديد المباراة:\n${match.home} 🆚 ${match.away}\n\n✍️ اسأل الآن (فوز – ركنيات – بطاقات – شوط أول…)`
      );
    }

    // سؤال ذكي
    const home = session.match.split(" vs ")[0];
    const away = session.match.split(" vs ")[1];

    const homeStats = await getTeamStatsSportmonks(home);
    const awayStats = await getTeamStatsSportmonks(away);

    const prompt = `
أنت محلل كرة قدم محترف ⚽📊🔥
اعتمد فقط على الأرقام، لا تخمّن.

🏟️ المباراة:
${session.match}

📈 ${home}:
${homeStats ? JSON.stringify(homeStats) : "لا توجد بيانات"}

📉 ${away}:
${awayStats ? JSON.stringify(awayStats) : "لا توجد بيانات"}

🎯 نوع السؤال: ${intent}

أجب باختصار + إيموجي:

WINNER → 🏆 الفائز المتوقع (%)
HALF → ⏱️ الشوط الأول
CORNERS → 🚩 الركنيات
CARDS → 🟨 البطاقات
SHOTS → ⚽ التسديدات
FOULS → ❌ الأخطاء
COMMENT → 👍 تعليق تحليلي
`;

    const answer = await askAI(prompt);
    return bot.sendMessage(chatId, answer);
  }
});

console.log("✅ Bot_User running with AI + API-Football + SportMonks");
