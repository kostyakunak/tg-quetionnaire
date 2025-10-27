# 🚀 Деплой анкеты на Railway

## Шаг 1: Подготовка кода
```bash
# Собираем фронтенд
npm ci
npm run build

# Проверяем, что dist/ создался
ls -la dist/
```

## Шаг 2: Создание сервиса в Railway

1. **Открой Railway проект** `fabulous-stillness`
2. **New Service** → **Deploy from GitHub**
3. **Выбери репозиторий** с анкетой
4. **Настрой переменные** (Railway → Variables):

```
PORT=8000
DATABASE_URL=postgresql://postgres:PrzTJRLGOIkonYgOhDwsIGzrQMaQZBEQ@switchback.proxy.rlwy.net:17906/railway
BOT_TOKEN=7871145012:AAFtmysAVLnwclVTf_mwKbxF8aZT55FCfbI
BOT_USERNAME=fivechairs_bot
FRONTEND_ORIGIN=https://www.5chairs.app
TEST_MODE=false
```

5. **Start Command:**
```
python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## Шаг 3: Настройка домена

1. **Railway → Settings → Domains**
2. **Add Custom Domain:** `www.5chairs.app`
3. **Скопируй CNAME** значение
4. **Namecheap → Advanced DNS:**
   - CNAME: `www` → `[значение от Railway]`
   - Redirect: `5chairs.app` → `https://www.5chairs.app/` (301)

## Шаг 4: Настройка Telegram

1. **@BotFather:** `/setdomain https://www.5chairs.app`
2. **Проверь:** бот должен принимать команды

## Шаг 5: Тестирование

1. **Открой** `https://www.5chairs.app`
2. **Проверь замочек** (HTTPS)
3. **Пройди анкету** → Telegram Login
4. **Проверь БД:** данные сохранились

## Шаг 6: Настройка платёжки

1. **Namecheap → Advanced DNS:**
   - CNAME: `pay` → `[твой-netlify-app].netlify.app`
2. **Netlify → Domain settings:**
   - Custom domain: `pay.5chairs.app`

## Готово! 🎉

- ✅ `www.5chairs.app` — анкета на Railway
- ✅ `pay.5chairs.app` — платёжка на Netlify
- ✅ Telegram Login работает
- ✅ HTTPS везде
