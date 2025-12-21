import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../api/auth/auth.api';
import '../../assets/styles/AuthPage.css';

export const VerifyEmailPage: React.FC = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const { isAuthenticated, isLoading: isAuthLoading, refreshUser } = useAuthStore();
    const navigate = useNavigate();

    // Редирект если не авторизован
    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            navigate('/auth/login', { replace: true });
        }
    }, [isAuthenticated, isAuthLoading, navigate]);

    // Показываем загрузку пока проверяется авторизация
    if (isAuthLoading || !isAuthenticated) {
        return (
            <div className="auth-loading">
                <div className="auth-loading-text">Загрузка...</div>
            </div>
        );
    }

    const handleChange = (index: number, value: string) => {
        // Разрешаем только цифры
        if (value && !/^\d$/.test(value)) {
            return;
        }

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        setError('');

        // Автоматический переход на следующий input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Удаление и переход на предыдущий input
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        // Вставка из буфера обмена
        if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            navigator.clipboard.readText().then(text => {
                const digits = text.replace(/\D/g, '').slice(0, 6);
                const newCode = [...code];
                digits.split('').forEach((digit, i) => {
                    if (index + i < 6) {
                        newCode[index + i] = digit;
                    }
                });
                setCode(newCode);
                if (digits.length === 6) {
                    inputRefs.current[5]?.focus();
                } else {
                    inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
                }
            });
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const digits = pastedText.replace(/\D/g, '').slice(0, 6);
        const newCode = [...code];
        digits.split('').forEach((digit, i) => {
            if (i < 6) {
                newCode[i] = digit;
            }
        });
        setCode(newCode);
        if (digits.length === 6) {
            inputRefs.current[5]?.focus();
        } else {
            inputRefs.current[digits.length]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const verificationCode = code.join('');
        if (verificationCode.length !== 6) {
            setError('Введите полный 6-значный код');
            return;
        }

        setIsLoading(true);

        try {
            await authApi.verifyEmail({ code: verificationCode });
            // Обновляем данные пользователя после успешной верификации
            await refreshUser();
            // Перенаправляем на главную
            navigate('/', { replace: true });
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Неверный код подтверждения';
            setError(errorMessage);
            // Очищаем код при ошибке
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Заголовок */}
                <div className="auth-header">
                    <h1 className="auth-title">Подтверждение почты</h1>
                    <p className="auth-subtitle">
                        Введите 6-значный код, отправленный на вашу почту
                    </p>
                </div>

                {/* Форма */}
                <div className="auth-card">
                    <div className="auth-card-header">
                        <h3>Код подтверждения</h3>
                    </div>
                    <div className="auth-card-content">
                        <form onSubmit={handleSubmit} className="auth-form">
                            {error && (
                                <div className="auth-error">
                                    <span className="auth-error-icon">⚠</span>
                                    <p className="auth-error-text">{error}</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                                {code.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={index === 0 ? handlePaste : undefined}
                                        className="auth-form-input"
                                        style={{
                                            width: '50px',
                                            height: '60px',
                                            textAlign: 'center',
                                            fontSize: '24px',
                                            fontWeight: '600',
                                            padding: '0'
                                        }}
                                        disabled={isLoading}
                                        autoFocus={index === 0}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || code.join('').length !== 6}
                                className="auth-form-button"
                            >
                                {isLoading ? 'Проверка...' : 'Подтвердить'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

