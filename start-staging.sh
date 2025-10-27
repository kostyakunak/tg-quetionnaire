#!/bin/bash

echo "🚀 Запуск staging среды..."

# Копируем настройки staging
cp env.staging .env

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
echo "Сервер будет доступен по адресу: http://localhost:8000"
echo "Для продакшена обязательно настройте HTTPS!"

python backend/main.py
