# --- ЭТАП 1: Сборка фронтенда ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
# Vite соберет всё в папку /app/client/dist
RUN npm run build

# --- ЭТАП 2: Сборка бэкенда и рантайм ---
FROM python:3.13-slim
WORKDIR /app

# Системный софт
RUN apt-get update && apt-get install -y \
    redis-server \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Ставим Poetry (версия 2.0+)
RUN pip install poetry
RUN poetry config virtualenvs.create false
RUN mkdir -p /app/logs

# Ставим зависимости бэка
COPY pyproject.toml poetry.lock ./
RUN poetry install --no-root --no-interaction --no-ansi

# Копируем весь проект
COPY . .

# Копируем билд фронта из первого этапа в папку Nginx
COPY --from=frontend-build /app/client/dist /var/www/html

# Конфиги серверов
COPY nginx.conf /etc/nginx/sites-available/default
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]