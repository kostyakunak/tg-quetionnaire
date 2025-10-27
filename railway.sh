#!/bin/bash

# Скрипт для деплоя на Railway
echo "🚀 Подготовка к деплою на Railway..."

# Собираем фронтенд
echo "📦 Сборка фронтенда..."
npm ci
npm run build

# Проверяем, что dist создался
if [ ! -d "dist" ]; then
    echo "❌ Ошибка: dist/ не создался"
    exit 1
fi

echo "✅ Готово к деплою!"
echo "📂 Файлы в dist/ готовы"
echo "🐍 Python зависимости в requirements.txt"
echo "🌐 Запуск: python -m uvicorn backend.main:app --host 0.0.0.0 --port \$PORT"
