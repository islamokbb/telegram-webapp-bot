import requests
import re
from deep_translator import GoogleTranslator
import telebot
from telebot import types

token = "8579302087:AAHYaZr8wzEWEBjthbywSQvXgHocEL7GOww" 
Hesion = telebot.TeleBot(token)

def translate_text(text, target_language='en'):
    translated = GoogleTranslator(source='auto', target=target_language).translate(text)
    return translated

def Hasso(query, chat_id):
    if re.search('[\u0600-\u06FF]', query): 
        query = translate_text(query, 'en')
    
    url = "https://api.getimg.ai/v1/stable-diffusion-xl/text-to-image"
    headers = {
        'Host': 'api.getimg.ai',
        'Accept': 'application/json',
        'Authorization': 'Bearer key-3XbWkFO34FVCQUnJQ6A3qr702Eu7DDR1dqoJOyhMHqhruEhs22KUzR7w631ZFiA5OFZIba7i44qDQEMpKxzegOUm83vCfILb',
        'Content-Type': 'application/json',
        'User-Agent': 'okhttp/4.12.0',
        'Connection': 'keep-alive'
    }
    payload = {
        'height': 1024,
        'model': 'realvis-xl-v4',
        'negative_prompt': None,
        'prompt': query,
        'response_format': 'url',
        'seed': 0,
        'steps': 30,
        'width': 1024,
    }

    response = requests.post(url, headers=headers, json=payload).json()
    image_url = response.get('url')
    
    if image_url:
        telegram_url = f"https://api.telegram.org/bot{token}/sendPhoto"
        telegram_params = {
            'chat_id': chat_id,
            'photo': image_url,
            'caption': f"صوره تم البحث.عنها: {query}"
        }
        telegram_response = requests.post(telegram_url, data=telegram_params)
        
        if telegram_response.status_code == 200:
            Hesion.send_message(chat_id, "تم بنجاح ارسال صوره")
        else:
            Hesion.send_message(chat_id, "لم يتم ارسال صوره.")
    else:
        Hesion.send_message(chat_id, " ماموجود هذه البحث.")

@Hesion.message_handler(commands=['start'])
def send_welcome(message):
    markup = types.InlineKeyboardMarkup()
    item = types.InlineKeyboardButton('✨دوس البد✨', callback_data='create_image')
    developerj = types.InlineKeyboardButton('✨ حسابي ✨', url='https://t.me/lIIHII')
    channelj = types.InlineKeyboardButton('قناتنا ⚠️', url='https://t.me/z3x5j')
    markup.add(developerj, channelj)
    markup.add(item)
    photo_url = f"https://t.me/{message.from_user.username}"
    namess = f"[{message.from_user.first_name}]({photo_url})"
    text = f"⚠️ هلا عزيزي نورت البوت ✨{namess}✨ في \nالبوت يدعم الغه العربيه ونكليزيه ضغط البد"
    Hesion.send_photo(message.chat.id, photo_url, caption=text, parse_mode='Markdown', reply_markup=markup)
@Hesion.callback_query_handler(func=lambda call: call.data == "create_image")
def ask_for_description(call):
    Hesion.send_message(call.message.chat.id, "كتب ماذا تريد بحث عنه:")

@Hesion.message_handler(func=lambda message: True)
def get_description(message):
    description = message.text
    chat_id = message.chat.id
    
    if re.search('[\u0600-\u06FF]', description):
        description = translate_text(description, 'en')
    Hasso(description, chat_id)

Hesion.polling()

 #اسرع وافضل ذكاء اصطناعي

#طبعن التصال شخص مستخرجه واني برمجت عليه هذه بوت
