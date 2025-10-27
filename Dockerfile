# Stage 1: Build frontend
FROM node:20 AS frontend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements.txt и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем backend код
COPY backend/ ./backend/

# Копируем собранный фронтенд из первого stage
COPY --from=frontend-builder /app/dist ./dist

# Устанавливаем переменные окружения
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Команда запуска
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
