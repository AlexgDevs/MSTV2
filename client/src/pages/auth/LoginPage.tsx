import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import '../../assets/styles/AuthPage.css';

export const LoginPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
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
        setIsLoading(true);

        try {
            await login(formData);
            navigate('/'); // Редирект на главную после успешного входа
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Ошибка входа';
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
                    <h1 className="auth-title">Вход в систему</h1>
                    <p className="auth-subtitle">
                        Нет аккаунта?{' '}
                        <Link to="/auth/register" className="auth-link">
                            Зарегистрируйтесь
                        </Link>
                    </p>
                </div>

                {/* Форма */}
                <div className="auth-card">
                    <div className="auth-card-header">
                        <h3>Данные для входа</h3>
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
                                    placeholder="Введите ваше имя"
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
                                    placeholder="Введите пароль"
                                    className="auth-form-input"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="auth-form-button"
                            >
                                {isLoading ? 'Вход...' : 'Войти'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};