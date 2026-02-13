# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

# Copy package files
COPY client/package.json ./
COPY client/package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY client/ ./

# Build frontend
RUN npm run build

# Stage 2: Python backend with supervisor
FROM python:3.10-slim

# Install supervisor and build dependencies
RUN apt-get update && apt-get install -y \
    supervisor \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install poetry
RUN pip install --no-cache-dir poetry

# Copy pyproject.toml and install Python dependencies
COPY pyproject.toml ./
RUN poetry config virtualenvs.create false && \
    poetry install --no-dev --no-interaction --no-ansi

# Copy supervisord config
COPY supervisord.conf /app/supervisord.conf

# Copy backend code
COPY server/ ./server/
COPY run_server.py ./
COPY migrations/ ./migrations/
COPY alembic.ini ./

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/client/dist ./client/dist

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Expose port 80
EXPOSE 80

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/app/supervisord.conf"]
