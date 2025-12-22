import { TURNSTILE_SITE_KEY, isTurnstileEnabled, isDevelopment } from './constants';

// Типы для Cloudflare Turnstile
declare global {
    interface Window {
        turnstile: {
            execute: (
                container: string | HTMLElement | null,
                options: {
                    sitekey: string;
                    action?: string;
                    cData?: string;
                    callback?: (token: string) => void;
                    'error-callback'?: (error: string) => void;
                    'expired-callback'?: () => void;
                    'timeout-callback'?: () => void;
                }
            ) => string | undefined;
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    theme?: 'light' | 'dark' | 'auto';
                    size?: 'normal' | 'compact';
                    callback?: (token: string) => void;
                }
            ) => string;
            reset: (widgetId?: string) => void;
            remove: (widgetId?: string) => void;
        };
    }
}

/**
 * Выполняет Cloudflare Turnstile (невидимый режим) и возвращает токен
 * @param action - Действие для Turnstile (например, 'register', 'login')
 * @returns Токен Turnstile или null если не удалось получить
 */
export const executeTurnstile = async (action: string): Promise<string | null> => {
    // В dev режиме возвращаем mock токен (бэкенд должен его пропускать)
    if (isDevelopment()) {
        console.log('🔧 Dev режим: используем mock Turnstile токен');
        return 'dev-mock-turnstile-token';
    }

    // Проверяем что Turnstile доступна
    if (!isTurnstileEnabled()) {
        console.warn('Turnstile не настроена или не загружена');
        return null;
    }

    try {
        return new Promise((resolve, reject) => {
            // Используем невидимый режим Turnstile
            const widgetId = window.turnstile.execute('', {
                sitekey: TURNSTILE_SITE_KEY,
                action: action,
                callback: (token: string) => {
                    resolve(token);
                },
                'error-callback': (error: string) => {
                    console.error('Ошибка Turnstile:', error);
                    reject(new Error(error));
                },
                'expired-callback': () => {
                    console.warn('Turnstile токен истек');
                    reject(new Error('Token expired'));
                },
                'timeout-callback': () => {
                    console.warn('Turnstile timeout');
                    reject(new Error('Timeout'));
                }
            });

            // Если execute вернул undefined, значит произошла ошибка
            if (!widgetId) {
                reject(new Error('Failed to execute Turnstile'));
            }
        });
    } catch (error) {
        console.error('Ошибка при инициализации Turnstile:', error);
        return null;
    }
};

/**
 * Хук для использования Turnstile в компонентах
 * @param action - Действие для Turnstile
 * @returns Функция для получения токена
 */
export const useTurnstile = (action: string) => {
    return () => executeTurnstile(action);
};

