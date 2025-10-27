#!/bin/bash

echo "🚀 Запуск production среды..."

# Копируем настройки production
cp env.production .env

# Проверяем наличие Python зависимостей
if [ ! -d "venv" ]; then
    echo "📦 Создание виртуального окружения..."
    python3 -m venv venv
fi

echo "🔧 Активация виртуального окружения..."
source venv/bin/activate

echo "📥 Установка зависимостей..."
pip install -r requirements.txt

echo "🌐 Запуск сервера..."
echo "⚠️  ВАЖНО: Убедитесь, что сайт работает по HTTPS!"
echo "Telegram виджет не работает по HTTP в продакшене!"

python backend/main.py
