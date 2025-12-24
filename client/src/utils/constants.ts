// Cloudflare Turnstile Site Key (публичный ключ)
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

// Проверка что мы в dev режиме (localhost)
export const isDevelopment = () => {
    return import.meta.env.DEV || 
           window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
};

// Проверка что Turnstile настроена
export const isTurnstileEnabled = () => {
    // В dev режиме всегда возвращаем true (будет использован mock токен)
    if (isDevelopment()) {
        return true;
    }
    return !!TURNSTILE_SITE_KEY && typeof window !== 'undefined' && 'turnstile' in window;
};
