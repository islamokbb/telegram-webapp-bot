const TelegramBot = require('node-telegram-bot-api');

const token = "8579302087:AAHYaZr8wzEWEBjthbywSQvXgHocEL7GOww";
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "مرحبا 👋 اضغط لفتح الموقع:",
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: "🌐 Open Website",
            web_app: { url: "https://powercardx.com/" }
          }
        ]]
      }
    }
  );
});
