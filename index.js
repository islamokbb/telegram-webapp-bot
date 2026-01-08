const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

// ============ TOKENS ============
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const ADMIN_ID = Number(process.env.ADMIN_ID);

// ============ BOT ============
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ============ STATE ============
const AI_USERS = new Set();

// ============ HELPERS ============
function clean(text = "") {
  return text.replace(/[*_`]/g, "");
}

// ============ AI ============
async function askAI(q) {
  try {
    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodeURIComponent(
        "أنت محلل كرة قدم محترف، حلل بدقة:\n" + q
      )}`
    );
    const data = await res.json();
    return clean(data.response || "❌ لا يوجد تحليل");
  } catch {
    return "⚠️ الذكاء الاصطناعي غير متاح";
  }
}

// ============ MATCHES ============
async function todayMatches() {
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?date=${today}`,
    { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
  );
  const data = await res.json();
  return data.response.slice(0, 6);
}

// ============ STANDINGS (كل الدوريات) ============
async function leagueStandings(league) {
  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=${league}&season=2025`,
    { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
  );
  const data = await res.json();
  return data.response?.[0]?.league?.standings?.[0]?.slice(0, 5) || [];
}

// ============ START ============
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "⚽ محلل كرة القدم الذكي\nاختر من القائمة 👇",
    {
      reply_markup: {
        keyboard: [
          ["📅 مباريات اليوم", "📊 ترتيب الدوري"],
          ["🤖 تحليل رياضي"],
          ADMIN_ID === msg.from.id ? ["➕ إضافة توقع اليوم"] : [],
          ["❌ إيقاف التحليل"]
        ],
        resize_keyboard: true
      }
    }
  );
});

// ============ MESSAGES ============
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // مباريات اليوم
  if (text === "📅 مباريات اليوم") {
    const m = await todayMatches();
    let r = "📅 مباريات اليوم:\n\n";
    m.forEach(x => {
      r += `${x.teams.home.name} 🆚 ${x.teams.away.name}\n`;
    });
    return bot.sendMessage(chatId, r);
  }

  // ترتيب الدوري (مثال: الإنجليزي)
  if (text === "📊 ترتيب الدوري") {
    const t = await leagueStandings(39);
    let r = "📊 ترتيب الدوري الإنجليزي:\n\n";
    t.forEach(x => {
      r += `${x.rank}. ${x.team.name} (${x.points})\n`;
    });
    return bot.sendMessage(chatId, r);
  }

  // تشغيل التحليل
  if (text === "🤖 تحليل رياضي") {
    AI_USERS.add(chatId);
    return bot.sendMessage(chatId, "✍️ اكتب سؤالك الرياضي");
  }

  // إيقاف التحليل
  if (text === "❌ إيقاف التحليل") {
    AI_USERS.delete(chatId);
    return bot.sendMessage(chatId, "🛑 تم إيقاف التحليل");
  }

  // إدخال الأدمن
  if (text === "➕ إضافة توقع اليوم" && msg.from.id === ADMIN_ID) {
    return bot.sendMessage(chatId, "✍️ أرسل توقع اليوم الآن");
  }

  // AI CHAT
  if (AI_USERS.has(chatId)) {
    bot.sendChatAction(chatId, "typing");
    const ans = await askAI(text);
    return bot.sendMessage(chatId, ans);
  }
});

console.log("✅ Bot is running...");
