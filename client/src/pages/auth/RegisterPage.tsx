import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import '../../assets/styles/AuthPage.css';

export const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        verificationToken: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { register, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
    const navigate = useNavigate();

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

        if (!formData.verificationToken.trim()) {
            setError('Укажите токен подтверждения, отправленный на почту');
            return;
        }

        setIsLoading(true);

        try {
            await register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                verified_token: formData.verificationToken
            });
            navigate('/'); // Редирект на главную после успешной регистрации
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
                                <label htmlFor="verificationToken" className="auth-form-label">
                                    Токен подтверждения
                                </label>
                                <input
                                    id="verificationToken"
                                    name="verificationToken"
                                    type="text"
                                    value={formData.verificationToken}
                                    onChange={handleChange}
                                    required
                                    placeholder="Из письма после регистрации"
                                    className="auth-form-input"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
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