#!/bin/bash

# Простой скрипт для запуска проекта локально
set -e

echo "🚀 Запуск 5chairs локально..."

# Переменные окружения
export PGPASSWORD="fNheHqmosfiPdHULGCICNHZuXwUyNvLQ"
export DATABASE_URL="postgresql://postgres:${PGPASSWORD}@trolley.proxy.rlwy.net:55436/railway"
export BOT_TOKEN="dev_bot_token"
export BOT_USERNAME="dev_bot_username"
export TEST_MODE="true"

# Проверяем Python версию
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "📋 Python версия: $PYTHON_VERSION"

# Создаем виртуальное окружение если нужно
if [ ! -d ".venv" ]; then
    echo "📦 Создаем виртуальное окружение..."
    python3 -m venv .venv
fi

# Активируем виртуальное окружение
echo "🔧 Активируем виртуальное окружение..."
source .venv/bin/activate

# Обновляем pip и устанавливаем зависимости
echo "📚 Устанавливаем Python зависимости..."
pip install --upgrade pip
pip install -r requirements.txt

# Устанавливаем Node зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем Node зависимости..."
    npm ci --no-audit --no-fund
fi

# Убиваем процессы на портах 8000 и 5173
echo "🧹 Очищаем порты..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Запускаем бэкенд в фоне
echo "🔧 Запускаем бэкенд на порту 8000..."
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Ждем запуска бэкенда
sleep 3

# Проверяем что бэкенд запустился
if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo "✅ Бэкенд запущен и отвечает"
else
    echo "❌ Бэкенд не отвечает"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Запускаем фронтенд
echo "🎨 Запускаем фронтенд на порту 5173..."
npm run dev -- --port 5173 --strictPort --host 127.0.0.1 &
FRONTEND_PID=$!

# Ждем запуска фронтенда
sleep 3

echo ""
echo "🎉 Проект запущен!"
echo "📱 Фронтенд: http://127.0.0.1:5173"
echo "🔧 Бэкенд: http://127.0.0.1:8000"
echo "📊 Health: http://127.0.0.1:8000/health"
echo ""
echo "Для остановки нажми Ctrl+C"

# Функция очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Останавливаем сервисы..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ Готово"
    exit 0
}

# Перехватываем Ctrl+C
trap cleanup SIGINT

# Ждем завершения процессов
wait
