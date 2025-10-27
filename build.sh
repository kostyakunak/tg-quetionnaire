#!/bin/bash

# Скрипт для сборки продакшена
echo "🚀 Сборка проекта для продакшена..."

# Проверяем наличие переменных окружения
if [ -z "$BOT_USERNAME" ]; then
    echo "❌ Ошибка: BOT_USERNAME не установлен"
    echo "Установите переменную окружения: export BOT_USERNAME=your_bot_name"
    exit 1
fi

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Ошибка: BOT_TOKEN не установлен"
    echo "Установите переменную окружения: export BOT_TOKEN=your_bot_token"
    exit 1
fi

# Создаем dist директорию
echo "📁 Создание dist директории..."
mkdir -p dist

# Копируем статические файлы
echo "📋 Копирование статических файлов..."
cp index.html dist/
cp -r src dist/

# Заменяем плейсхолдеры в файлах
echo "🔧 Замена плейсхолдеров..."

# Заменяем в HTML
sed -i.bak "s/your_bot_username/$BOT_USERNAME/g" dist/index.html

# Заменяем в JS файлах
find dist/src -name "*.js" -exec sed -i.bak "s/your_bot_username/$BOT_USERNAME/g" {} \;

# Удаляем backup файлы
find dist -name "*.bak" -delete

echo "✅ Сборка завершена!"
echo "📂 Файлы готовы в директории dist/"
echo "🌐 Запустите сервер: python backend/main.py"
