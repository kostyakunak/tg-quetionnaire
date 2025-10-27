# 🚀 Быстрый старт

## Что у нас готово:
✅ Все критические исправления внесены  
✅ Имя бота заменено на `fivechairs_bot`  
✅ Настройки для staging и production готовы  
✅ CORS настроен для безопасности  
✅ Тестовые функции скрыты  

## Следующие шаги:

### 1. Настройка бота в Telegram
```bash
# Откройте @BotFather в Telegram
/setdomain
# Укажите ваш домен (например: yourdomain.com)
```

### 2. Запуск staging
```bash
chmod +x start-staging.sh
./start-staging.sh
```

### 3. Запуск production  
```bash
chmod +x start-production.sh
./start-production.sh
```

### 4. Обязательно настройте HTTPS!
- Telegram виджет работает **только по HTTPS**
- Без HTTPS авторизация не будет работать
- Используйте Let's Encrypt или другой SSL сертификат

### 5. Проверка работы
1. Откройте сайт по HTTPS
2. Пройдите анкету
3. Проверьте авторизацию через Telegram
4. Убедитесь, что данные сохранились в БД

## Важные файлы:
- `env.staging` - настройки для тестирования
- `env.production` - настройки для продакшена  
- `DEPLOYMENT.md` - подробная инструкция
- `start-staging.sh` / `start-production.sh` - скрипты запуска

## Готово к запуску рекламы! 🎯
