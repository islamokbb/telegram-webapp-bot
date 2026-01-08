const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const crypto = require("crypto");

// ================= CONFIG =================
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;

// كود الإدارة (دائم + مستحيل التخمين)
const ADMIN_ID = 7771891436;
const SECRET_PHRASE = "Qx#9!aZ@2026_Football_AI";
const SECRET_ADMIN_CODE = crypto
  .createHash("sha256")
  .update(ADMIN_ID + SECRET_PHRASE)
  .digest("hex");

// ================= BOT =================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ================= FILES =================
const BETS_FILE = "bets.json";
const SETTINGS_FILE = "settings.json";
const STATS_FILE = "stats.json";

if (!fs.existsSync(BETS_FILE)) fs.writeFileSync(BETS_FILE, "[]");
if (!fs.existsSync(SETTINGS_FILE))
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify({
      winner: true,
      corners: true,
      cards: true,
      shots: true,
      fouls: true,
      aiMode: "bet"
    }, null, 2)
  );
if (!fs.existsSync(STATS_FILE))
  fs.writeFileSync(
    STATS_FILE,
    JSON.stringify({ users: 0, analysis: 0, prediction: 0 }, null, 2)
  );

// ================= STATE =================
const USER_STATE = new Map(); // NONE | ANALYSIS | PREDICTION | ADD_BET
const ADMIN_SESSIONS = new Set();

// ================= HELPERS =================
const load = f => JSON.parse(fs.readFileSync(f));
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

function mainKeyboard() {
  return {
    keyboard: [
      ["🤖 تحليل رياضي AI", "🎯 توقع رياضي AI"],
      ["📰 أوراق اليوم"],
      ["❌ إيقاف التحليل"]
    ],
    resize_keyboard: true
  };
}

// ================= START =================
bot.onText(/\/start/, msg => {
  USER_STATE.set(msg.chat.id, "NONE");
  ADMIN_SESSIONS.delete(msg.chat.id);

  const stats = load(STATS_FILE);
  stats.users += 1;
  save(STATS_FILE, stats);

  bot.sendMessage(msg.chat.id, "⚽ مرحبًا بك", {
    reply_markup: mainKeyboard()
  });
});

// ================= HANDLER =================
bot.on("message", async msg => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text) return;

  // ===== دخول لوحة التحكم =====
  if (text === SECRET_ADMIN_CODE) {
    ADMIN_SESSIONS.add(chatId);
    return bot.sendMessage(chatId, "🛠️ لوحة التحكم", {
      reply_markup: {
        keyboard: [
          ["📰 إدارة أوراق اليوم"],
          ["🎯 إعدادات التوقع"],
          ["🤖 إعدادات الذكاء"],
          ["📊 إحصائيات"],
          ["🚪 خروج"]
        ],
        resize_keyboard: true
      }
    });
  }

  // ===== خروج =====
  if (text === "🚪 خروج") {
    ADMIN_SESSIONS.delete(chatId);
    USER_STATE.set(chatId, "NONE");
    return bot.sendMessage(chatId, "تم الخروج", {
      reply_markup: mainKeyboard()
    });
  }

  // ===== إدارة أوراق اليوم =====
  if (text === "📰 إدارة أوراق اليوم" && ADMIN_SESSIONS.has(chatId)) {
    return bot.sendMessage(chatId, "إدارة أوراق اليوم:", {
      reply_markup: {
        keyboard: [
          ["➕ إضافة", "👀 عرض"],
          ["🗑️ حذف"],
          ["⬅️ رجوع"]
        ],
        resize_keyboard: true
      }
    });
  }

  if (text === "➕ إضافة" && ADMIN_SESSIONS.has(chatId)) {
    USER_STATE.set(chatId, "ADD_BET");
    return bot.sendMessage(chatId, "اكتب الأوراق (كل سطر ورقة):");
  }

  if (USER_STATE.get(chatId) === "ADD_BET" && ADMIN_SESSIONS.has(chatId)) {
    save(BETS_FILE, text.split("\n").filter(Boolean));
    USER_STATE.set(chatId, "NONE");
    return bot.sendMessage(chatId, "✅ تم الحفظ");
  }

  if (text === "👀 عرض") {
    const bets = load(BETS_FILE);
    return bot.sendMessage(chatId, bets.length ? bets.join("\n") : "لا يوجد");
  }

  if (text === "🗑️ حذف") {
    save(BETS_FILE, []);
    return bot.sendMessage(chatId, "🗑️ تم الحذف");
  }

  // ===== إعدادات التوقع =====
  if (text === "🎯 إعدادات التوقع" && ADMIN_SESSIONS.has(chatId)) {
    const s = load(SETTINGS_FILE);
    return bot.sendMessage(chatId, JSON.stringify(s, null, 2));
  }

  // ===== إعدادات الذكاء =====
  if (text === "🤖 إعدادات الذكاء" && ADMIN_SESSIONS.has(chatId)) {
    return bot.sendMessage(chatId, "الوضع الحالي: رهاني");
  }

  // ===== إحصائيات =====
  if (text === "📊 إحصائيات" && ADMIN_SESSIONS.has(chatId)) {
    const st = load(STATS_FILE);
    return bot.sendMessage(
      chatId,
      `👥 مستخدمون: ${st.users}\n🤖 تحليلات: ${st.analysis}\n🎯 توقعات: ${st.prediction}`
    );
  }

  // ===== المستخدم العادي =====
  if (text === "📰 أوراق اليوم") {
    const bets = load(BETS_FILE);
    return bot.sendMessage(chatId, bets.length ? bets.join("\n") : "لا يوجد");
  }

  if (text === "🤖 تحليل رياضي AI") {
    USER_STATE.set(chatId, "ANALYSIS");
    return bot.sendMessage(chatId, "اكتب سؤالك التحليلي");
  }

  if (text === "🎯 توقع رياضي AI") {
    USER_STATE.set(chatId, "PREDICTION");
    return bot.sendMessage(chatId, "اكتب اسم المباراة");
  }

  if (text === "❌ إيقاف التحليل") {
    USER_STATE.set(chatId, "NONE");
    return bot.sendMessage(chatId, "تم الإيقاف");
  }
});

console.log("✅ Bot is running");      { headers: { "x-apisports-key": FOOTBALL_API_KEY } }
    );
    const j = await res.json();
    if (j.response && j.response.length) {
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
    if (j.data && j.data.length) {
      stats += "تم العثور على بيانات إضافية.\n";
    }
  } catch {}

  return stats || "لا توجد إحصائيات مباشرة، سيتم الاعتماد على التحليل الذكي.";
}

// ================= START =================
bot.onText(/\/start/, msg => {
  const kb = [
    ["🤖 تحليل رياضي AI","🎯 توقع رياضي AI"],
    ["📰 أوراق اليوم"],
    ["❌ إيقاف التحليل"]
  ];
  if (msg.from.id === ADMIN_ID) kb.push(["➕ إضافة رهان"]);

  bot.sendMessage(msg.chat.id,"⚽ أهلاً بك",{
    reply_markup:{keyboard:kb,resize_keyboard:true}
  });
  STATE.set(msg.chat.id,"NONE");
});

// ================= HANDLER =================
bot.on("message", async msg => {
  const id = msg.chat.id;
  const t = msg.text;
  if (!t) return;

  if (t==="🤖 تحليل رياضي AI") {
    STATE.set(id,"ANALYZE");
    return bot.sendMessage(id,"اكتب سؤالك التحليلي");
  }

  if (t==="🎯 توقع رياضي AI") {
    STATE.set(id,"PREDICT");
    return bot.sendMessage(id,"اكتب اسم المباراة");
  }

  if (t==="❌ إيقاف التحليل") {
    STATE.set(id,"NONE");
    return bot.sendMessage(id,"تم الإيقاف");
  }

  if (t==="📰 أوراق اليوم") {
    const bets = JSON.parse(fs.readFileSync(BETS_FILE));
    if (!bets.length) return bot.sendMessage(id,"📭 لا توجد رهانات");
    return bot.sendMessage(id,"📰 أوراق اليوم:\n\n"+bets.map((b,i)=>`${i+1}. ${b}`).join("\n"));
  }

  if (t==="➕ إضافة رهان" && msg.from.id===ADMIN_ID) {
    STATE.set(id,"ADD");
    return bot.sendMessage(id,"اكتب الرهانات (كل سطر رهان)");
  }

  if (STATE.get(id)==="ADD" && msg.from.id===ADMIN_ID) {
    const bets = JSON.parse(fs.readFileSync(BETS_FILE));
    t.split("\n").forEach(b=>b.trim()&&bets.push(b.trim()));
    fs.writeFileSync(BETS_FILE,JSON.stringify(bets,null,2));
    STATE.set(id,"NONE");
    return bot.sendMessage(id,"✅ تم الحفظ");
  }

  if (STATE.get(id)==="ANALYZE") {
    bot.sendChatAction(id,"typing");
    return bot.sendMessage(id,await askAI(`حلل رياضيًا:\n${t}`));
  }

  if (STATE.get(id)==="PREDICT") {
    bot.sendChatAction(id,"typing");
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
    return bot.sendMessage(id,ai);
  }
});

console.log("✅ Bot running");
