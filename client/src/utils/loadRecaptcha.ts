import { TURNSTILE_SITE_KEY } from './constants';

/**
 * Динамически загружает скрипт Cloudflare Turnstile
 */
export const loadTurnstileScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Проверяем что скрипт еще не загружен
        if (document.querySelector('script[src*="turnstile"]')) {
            resolve();
            return;
        }

        // Проверяем что есть site key
        if (!TURNSTILE_SITE_KEY) {
            console.warn('TURNSTILE_SITE_KEY не настроен');
            resolve(); // Разрешаем промис, но Turnstile не будет работать
            return;
        }

        // Создаем и добавляем скрипт
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            resolve();
        };
        
        script.onerror = () => {
            console.error('Ошибка загрузки Turnstile скрипта');
            reject(new Error('Failed to load Turnstile script'));
        };

        document.head.appendChild(script);
    });
};

