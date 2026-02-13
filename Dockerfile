# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

# Copy package files
COPY client/package.json ./
COPY client/package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

# Copy source code
COPY client/ ./

# Build frontend
RUN npm run build

# Stage 2: Python backend with supervisor
FROM python:3.13-slim

# Install supervisor and build dependencies
RUN apt-get update && apt-get install -y \
    supervisor \
    redis-server \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install poetry (фиксируем версию для стабильности)
RUN pip install --no-cache-dir "poetry>=2.0.0"

# Копируем ОБА файла конфигурации зависимостей
# Это важно для идентичности сборок
COPY pyproject.toml poetry.lock* ./

# Установка зависимостей через новый синтаксис Poetry 2.x
RUN poetry config virtualenvs.create false && \
    poetry config installer.max-workers 10 && \
    poetry install --only main --no-interaction --no-ansi --no-root

# Копируем конфигурацию supervisor
COPY supervisord.conf /app/supervisord.conf

# Копируем код сервера и миграции
COPY server/ ./server/
COPY run_server.py ./
COPY migrations/ ./migrations/
COPY alembic.ini ./

# Копируем билд фронтенда из первого этапа
COPY --from=frontend-builder /app/client/dist ./client/dist

# Настройки окружения
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Открываем порт
EXPOSE 80

# Запуск через supervisor
CMD ["/usr/bin/supervisord", "-c", "/app/supervisord.conf"]