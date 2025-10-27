#!/bin/bash

# Супер простой запуск
echo "🚀 Запуск 5chairs..."

# Переменные окружения
export PGPASSWORD="fNheHqmosfiPdHULGCICNHZuXwUyNvLQ"
export DATABASE_URL="postgresql://postgres:${PGPASSWORD}@trolley.proxy.rlwy.net:55436/railway"
export BOT_TOKEN="dev_bot_token"
export BOT_USERNAME="dev_bot_username"
export TEST_MODE="true"

# Используем Python 3.11 если доступен, иначе 3.13
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
    echo "🐍 Используем Python 3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo "🐍 Используем Python 3"
else
    echo "❌ Python не найден"
    exit 1
fi

# Создаем venv с правильной версией Python
if [ ! -d ".venv311" ]; then
    echo "📦 Создаем виртуальное окружение..."
    $PYTHON_CMD -m venv .venv311
fi

# Активируем venv
source .venv311/bin/activate

# Устанавливаем зависимости
echo "📚 Устанавливаем зависимости..."
pip install --upgrade pip
pip install fastapi uvicorn asyncpg pydantic python-multipart

# Устанавливаем Node зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем Node зависимости..."
    npm ci --no-audit --no-fund
fi

# Очищаем порты
echo "🧹 Очищаем порты..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Запускаем бэкенд
echo "🔧 Запускаем бэкенд..."
$PYTHON_CMD -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Ждем
sleep 3

# Проверяем бэкенд
if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo "✅ Бэкенд работает"
else
    echo "❌ Бэкенд не запустился"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Запускаем фронт
echo "🎨 Запускаем фронт..."
npm run dev -- --port 5173 --strictPort --host 127.0.0.1 &
FRONTEND_PID=$!

sleep 2

echo ""
echo "🎉 Готово!"
echo "📱 Открой: http://127.0.0.1:5173"
echo ""
echo "Для остановки: Ctrl+C"

# Очистка при выходе
cleanup() {
    echo ""
    echo "🛑 Останавливаем..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT
wait
