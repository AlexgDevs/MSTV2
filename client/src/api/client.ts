import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;

export const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // ОБЯЗАТЕЛЬНО для httpOnly куков
});

// Убираем ручную работу с токенами - они в httpOnly куках
API.interceptors.request.use((config) => {
    // Токены автоматически прикрепляются браузером
    return config;
});

// Отдаём 401 в обработчики компонентов, чтобы не ловить бесконечные редиректы
API.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);