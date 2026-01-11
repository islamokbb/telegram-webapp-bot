const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// ===== fetch (ضروري) =====
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ===== ENV =====
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const SPORTMONKS_API_KEY = process.env.SPORTMONKS_API_KEY;

// ===== BOT =====
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===== STATE & MEMORY =====
const STATE = new Map();      // NONE | ANALYZE | PREDICT | ADD
const MEMORY = new Map();     // آخر 3 رسائل

// ===== FILE =====
const BETS_FILE = "bets.json";
if (!fs.existsSync(BETS_FILE)) fs.writeFileSync(BETS_FILE, "[]");

// ===== HELPERS =====
const clean = (t = "") => t.replace(/[*_`[\]]/g, "").trim();

function remember(id, text) {
  if (!MEMORY.has(id)) MEMORY.set(id, []);
  const mem = MEMORY.get(id);
  mem.push(text);
  if (mem.length > 3) mem.shift();
}

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
    if (j.data?.length) stats += "تم العثور على بيانات إضافية.\n";
  } catch {}

  return stats || "لا توجد إحصائيات مباشرة، سيتم الاعتماد على التحليل الذكي.";
}

// ================= START =================
bot.onText(/\/start/, msg => {
  const kb = [
    ["🤖 تحليل رياضي AI", "🎯 توقع رياضي AI"],
    ["📰 أوراق اليوم"],
    ["❌ إيقاف التحليل"]
  ];

  if (msg.from.id === ADMIN_ID)
    kb.push(["➕ إضافة رهان", "🗑️ حذف رهانات اليوم"]);

  bot.sendMessage(msg.chat.id, "⚽ أهلاً بك في AZIX AI", {
    reply_markup: { keyboard: kb, resize_keyboard: true }
  });

  STATE.set(msg.chat.id, "NONE");
  MEMORY.delete(msg.chat.id);
});

// ================= HANDLER =================
bot.on("message", async msg => {
  const id = msg.chat.id;
  const t = msg.text;
  if (!t) return;

  // ---- STOP ----
  if (t === "❌ إيقاف التحليل") {
    STATE.set(id, "NONE");
    MEMORY.delete(id);
    return bot.sendMessage(id, "تم الإيقاف");
  }

  // ---- ANALYZE ----
  if (t === "🤖 تحليل رياضي AI") {
    STATE.set(id, "ANALYZE");
    MEMORY.delete(id);
    return bot.sendMessage(id, "🧠 اسأل أي سؤال تحليلي");
  }

  if (STATE.get(id) === "ANALYZE") {
    remember(id, t);
    const context = MEMORY.get(id).join("\n");

    bot.sendChatAction(id, "typing");
    return bot.sendMessage(
      id,
      await askAI(`
أنت محلل كرة قدم محترف.
سياق الأسئلة:
${context}

أجب على آخر سؤال فقط بدقة.
`)
    );
  }

  // ---- PREDICT ----
  if (t === "🎯 توقع رياضي AI") {
    STATE.set(id, "PREDICT");
    MEMORY.delete(id);
    return bot.sendMessage(id, "🎯 اسأل عن أي مباراة أو توقع");
  }

  if (STATE.get(id) === "PREDICT") {
    remember(id, t);
    const context = MEMORY.get(id).join("\n");
    const stats = await getStats(context);

    bot.sendChatAction(id, "typing");
    return bot.sendMessage(
      id,
      await askAI(`
توقع كرة قدم ذكي.
سياق المحادثة:
${context}

إحصائيات:
${stats}

أجب على آخر سؤال فقط بدون طرح أسئلة.
`)
    );
  }

  // ---- BETS ----
  if (t === "📰 أوراق اليوم") {
    const bets = JSON.parse(fs.readFileSync(BETS_FILE));
    if (!bets.length) return bot.sendMessage(id, "📭 لا توجد أوراق اليوم");
    return bot.sendMessage(
      id,
      "📰 أوراق اليوم:\n\n" + bets.map((b, i) => `${i + 1}. ${b}`).join("\n")
    );
  }

  if (t === "➕ إضافة رهان" && msg.from.id === ADMIN_ID) {
    STATE.set(id, "ADD");
    return bot.sendMessage(id, "✏️ اكتب الرهانات (كل سطر رهان)");
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
