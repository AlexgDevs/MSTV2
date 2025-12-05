import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;

export const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // ОБЯЗАТЕЛЬНО для httpOnly куков
});

// Флаг для предотвращения бесконечных циклов обновления токена
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Убираем ручную работу с токенами - они в httpOnly куках
API.interceptors.request.use((config) => {
    // Токены автоматически прикрепляются браузером
    return config;
});

// Обработка ответов с автоматическим обновлением токена
API.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Если ошибка 401 и это не запрос на обновление токена и не повторный запрос
        const url = originalRequest?.url || '';
        // Исключаем только /auth/refresh, чтобы избежать бесконечного цикла
        const isRefreshEndpoint = url.includes('/auth/refresh');
        
        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isRefreshEndpoint
        ) {
            if (isRefreshing) {
                // Если уже идет обновление токена, добавляем запрос в очередь
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        return API(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Пытаемся обновить токен напрямую через API, чтобы избежать циклической зависимости
                await API.post<{ status: string; tokens: { access: string } }>('/auth/refresh');
                processQueue(null);
                // Повторяем оригинальный запрос
                return API(originalRequest);
            } catch (refreshError) {
                // Если обновление не удалось, очищаем очередь и возвращаем ошибку
                processQueue(refreshError as AxiosError);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);