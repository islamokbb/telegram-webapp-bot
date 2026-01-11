const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// ===== fetch =====
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ===== ENV =====
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const SPORTMONKS_API_KEY = process.env.SPORTMONKS_API_KEY;

// ===== BOT =====
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===== STATE =====
const STATE = new Map(); // NONE | ANALYZE | PREDICT | ADD

// ===== FILE =====
const BETS_FILE = "bets.json";
if (!fs.existsSync(BETS_FILE)) fs.writeFileSync(BETS_FILE, "[]");

// ===== HELPERS =====
const clean = (t = "") => t.replace(/[*_`[\]]/g, "").trim();

// ================= AI =================
async function askAI(text) {
  try {
    const res = await fetch(
      `http://fi8.bot-hosting.net:20163/elos-gemina?text=${encodeURIComponent(text)}`
    );
    const j = await res.json();
    return clean(j.response || "لا يوجد رد");
  } catch {
    return "⚠️ الذكاء غير متاح الآن";
  }
}

// ================= APIs =================
async function getStats(match) {
  let stats = "";

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?search=${encodeURIComponent(match)}`,
      { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
    );
    const j = await res.json();
    if (j.response?.length) {
      const f = j.response[0];
      stats += `آخر مواجهة: ${f.teams.home.name} vs ${f.teams.away.name}\n`;
    }
  } catch {}

  try {
    const res = await fetch(
      `https://api.sportmonks.com/v3/football/fixtures?search=${encodeURIComponent(match)}`,
      { headers: { Authorization: SPORTMONKS_API_KEY } }
    );
    const j = await res.json();
    if (j.data?.length) {
      stats += "تم العثور على بيانات إضافية.\n";
    }
  } catch {}

  return stats || "لا توجد إحصائيات مباشرة، سيتم الاعتماد على التحليل الذكي.";
}

// ================= START =================
bot.onText(/\/start/, msg => {
  const kb = [
    ["🤖 تحليل رياضي AI", "🎯 توقع رياضي AI"],
    ["📰 أوراق اليوم"],
    ["❌ إيقاف"]
  ];

  if (msg.from.id === ADMIN_ID)
    kb.push(["➕ إضافة رهان", "🗑️ حذف رهانات اليوم"]);

  bot.sendMessage(msg.chat.id, "⚽ أهلاً بك في AZIX AI", {
    reply_markup: { keyboard: kb, resize_keyboard: true }
  });

  STATE.set(msg.chat.id, "NONE");
});

// ================= HANDLER =================
bot.on("message", async msg => {
  const id = msg.chat.id;
  const t = msg.text;
  if (!t) return;

  // ---- STOP ----
  if (t === "❌ إيقاف") {
    STATE.set(id, "NONE");
    return bot.sendMessage(id, "⛔ تم الإيقاف");
  }

  // ---- ANALYZE MODE ----
  if (t === "🤖 تحليل رياضي AI") {
    STATE.set(id, "ANALYZE"); // يوقف أي وضع سابق
    return bot.sendMessage(id, "🧠 اكتب سؤالك التحليلي");
  }

  if (STATE.get(id) === "ANALYZE") {
    // تجاهل الأزرار أثناء التحليل
    if (
      t === "🎯 توقع رياضي AI" ||
      t === "📰 أوراق اليوم" ||
      t === "➕ إضافة رهان" ||
      t === "🗑️ حذف رهانات اليوم"
    ) return;

    bot.sendChatAction(id, "typing");
    return bot.sendMessage(id, await askAI(`حلل رياضيًا:\n${t}`));
  }

  // ---- PREDICT MODE ----
  if (t === "🎯 توقع رياضي AI") {
    STATE.set(id, "PREDICT"); // يوقف التحليل تلقائيًا
    return bot.sendMessage(id, "✍️ اكتب اسم المباراة");
  }

  if (STATE.get(id) === "PREDICT") {
    bot.sendChatAction(id, "typing");
    const stats = await getStats(t);
    const ai = await askAI(`
توقع رياضي ذكي للمباراة:
${t}

اعتمد على:
${stats}

أعطني:
- الفائز مع نسبة
- الركنيات
- البطاقات
- التسديدات
- الأخطاء
`);
    return bot.sendMessage(id, ai);
  }

  // ---- BETS ----
  if (t === "📰 أوراق اليوم") {
    const bets = JSON.parse(fs.readFileSync(BETS_FILE));
    if (!bets.length) return bot.sendMessage(id, "📭 لا توجد رهانات");
    return bot.sendMessage(
      id,
      "📰 أوراق اليوم:\n\n" +
        bets.map((b, i) => `${i + 1}. ${b}`).join("\n")
    );
  }

  if (t === "➕ إضافة رهان" && msg.from.id === ADMIN_ID) {
    STATE.set(id, "ADD");
    return bot.sendMessage(id, "✍️ اكتب الرهانات (كل سطر رهان)");
  }

  if (STATE.get(id) === "ADD" && msg.from.id === ADMIN_ID) {
    const bets = JSON.parse(fs.readFileSync(BETS_FILE));
    t.split("\n").forEach(b => b.trim() && bets.push(b.trim()));
    fs.writeFileSync(BETS_FILE, JSON.stringify(bets, null, 2));
    STATE.set(id, "NONE");
    return bot.sendMessage(id, "✅ تم الحفظ");
  }

  if (t === "🗑️ حذف رهانات اليوم" && msg.from.id === ADMIN_ID) {
    fs.writeFileSync(BETS_FILE, "[]");
    return bot.sendMessage(id, "🗑️ تم حذف رهانات اليوم");
  }
});

console.log("✅ Bot running");
