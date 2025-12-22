import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { executeTurnstile } from '../../utils/recaptcha';
import { loadTurnstileScript } from '../../utils/loadRecaptcha';
import '../../assets/styles/AuthPage.css';

export const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);

    const { register, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
    const navigate = useNavigate();

    // Загружаем Turnstile скрипт при монтировании компонента
    useEffect(() => {
        loadTurnstileScript().catch(console.error);
    }, []);

    // Редирект если уже авторизован
    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, isAuthLoading, navigate]);

    // Показываем загрузку пока проверяется авторизация
    if (isAuthLoading || isAuthenticated) {
        return (
            <div className="auth-loading">
                <div className="auth-loading-text">Загрузка...</div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Валидация
        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        if (formData.password.length < 6) {
            setError('Пароль должен быть не менее 6 символов');
            return;
        }

        // Проверка согласия на обработку персональных данных
        if (!agreeToPrivacy) {
            setError('Необходимо согласие на обработку персональных данных');
            return;
        }

        if (!agreeToTerms) {
            setError('Необходимо принять пользовательское соглашение');
            return;
        }

        setIsLoading(true);

        try {
            // Получаем токен Turnstile (в dev режиме вернется mock токен)
            const turnstileToken = await executeTurnstile('register');
            
            if (!turnstileToken) {
                setError('Не удалось пройти проверку безопасности. Пожалуйста, обновите страницу.');
                setIsLoading(false);
                return;
            }

            await register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                recaptcha_token: turnstileToken // Используем то же поле для совместимости с бэкендом
            });
            // Перенаправляем на страницу верификации после успешной регистрации
            navigate('/auth/verify-email', { replace: true });
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Ошибка регистрации';
            // Если пользователь уже авторизован (403), редиректим на главную
            if (err.response?.status === 403 && errorMessage.includes('alredy logined')) {
                navigate('/', { replace: true });
                return;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Заголовок */}
                <div className="auth-header">
                    <h1 className="auth-title">Создать аккаунт</h1>
                    <p className="auth-subtitle">
                        Или{' '}
                        <Link to="/auth/login" className="auth-link">
                            войдите в существующий
                        </Link>
                    </p>
                </div>

                {/* Форма */}
                <div className="auth-card">
                    <div className="auth-card-header">
                        <h3>Данные для регистрации</h3>
                    </div>
                    <div className="auth-card-content">
                        <form onSubmit={handleSubmit} className="auth-form">
                            {error && (
                                <div className="auth-error">
                                    <span className="auth-error-icon">⚠</span>
                                    <p className="auth-error-text">{error}</p>
                                </div>
                            )}

                            <div className="auth-form-group">
                                <label htmlFor="name" className="auth-form-label">
                                    Имя пользователя
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Придумайте имя пользователя"
                                    className="auth-form-input"
                                />
                            </div>

                            <div className="auth-form-group">
                                <label htmlFor="email" className="auth-form-label">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="your@email.com"
                                    className="auth-form-input"
                                />
                            </div>

                            <div className="auth-form-group">
                                <label htmlFor="password" className="auth-form-label">
                                    Пароль
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Не менее 6 символов"
                                    className="auth-form-input"
                                />
                            </div>

                            <div className="auth-form-group">
                                <label htmlFor="confirmPassword" className="auth-form-label">
                                    Подтвердите пароль
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="Повторите пароль"
                                    className="auth-form-input"
                                />
                            </div>

                            <div className="auth-form-group">
                                <div className="auth-checkbox-group">
                                    <input
                                        id="agreeToPrivacy"
                                        type="checkbox"
                                        checked={agreeToPrivacy}
                                        onChange={(e) => setAgreeToPrivacy(e.target.checked)}
                                        required
                                        className="auth-checkbox"
                                    />
                                    <label htmlFor="agreeToPrivacy" className="auth-checkbox-label">
                                        Я согласен на{' '}
                                        <Link to="/privacy" target="_blank" className="auth-link-inline">
                                            обработку персональных данных
                                        </Link>
                                    </label>
                                </div>
                            </div>

                            <div className="auth-form-group">
                                <div className="auth-checkbox-group">
                                    <input
                                        id="agreeToTerms"
                                        type="checkbox"
                                        checked={agreeToTerms}
                                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                                        required
                                        className="auth-checkbox"
                                    />
                                    <label htmlFor="agreeToTerms" className="auth-checkbox-label">
                                        Я принимаю{' '}
                                        <Link to="/terms" target="_blank" className="auth-link-inline">
                                            пользовательское соглашение
                                        </Link>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !agreeToPrivacy || !agreeToTerms}
                                className="auth-form-button"
                            >
                                {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};