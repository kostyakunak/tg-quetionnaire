# Инструкция по развертыванию

## Критические требования для продакшена

### 1. HTTPS обязательно!
Telegram Login Widget работает **только по HTTPS** в продакшене. Без HTTPS авторизация не будет работать.

### 2. Переменные окружения
Используйте готовые файлы настроек:

**Для staging:**
```bash
cp env.staging .env
# Отредактируйте FRONTEND_ORIGIN на ваш staging домен
```

**Для production:**
```bash
cp env.production .env  
# Отредактируйте FRONTEND_ORIGIN на ваш production домен
```

**Настройки уже содержат:**
- ✅ Токен бота: `7871145012:AAFtmysAVLnwclVTf_mwKbxF8aZT55FCfbI`
- ✅ Staging БД: `trolley.proxy.rlwy.net:55436`
- ✅ Production БД: `switchback.proxy.rlwy.net:17906`
- ✅ Имя бота: `fivechairs_bot`

### 3. Настройка бота в Telegram
1. Убедитесь, что бот `@fivechairs_bot` создан через @BotFather
2. Выполните команду `/setdomain` и укажите ваш домен
3. Проверьте, что бот может принимать команды

### 4. База данных
Убедитесь, что в PostgreSQL созданы таблицы:
- `users` (id, username, name, surname, age, registration_date, status)
- `questions` (id, text, instruction, question_type, allow_other, display_order, active)
- `question_options` (id, question_id, option_text, display_order, active)
- `user_answers` (user_id, question_id, answer, answered_at)

### 5. Сборка и запуск

```bash
# Установите переменные окружения
export BOT_TOKEN="ваш_токен"
export BOT_USERNAME="fivechairs_bot"
export DATABASE_URL="postgresql://..."
export FRONTEND_ORIGIN="https://ваш-домен.com"

# Соберите проект
./build.sh

# Запустите сервер
python backend/main.py
```

### 6. Проверка работы
1. Откройте сайт по HTTPS
2. Пройдите анкету
3. Проверьте авторизацию через Telegram
4. Убедитесь, что данные сохранились в БД
5. Проверьте, что бот распознает пользователя

## Безопасность
- ✅ CORS настроен для конкретного домена
- ✅ Telegram авторизация проверяется через HMAC
- ✅ Тестовые функции скрыты в продакшене
- ✅ Все плейсхолдеры заменены на реальные значения

## Мониторинг
- Логи ошибок сохраняются в консоль
- UTM параметры логируются для аналитики
- Проверьте `/health` эндпоинт для мониторинга
