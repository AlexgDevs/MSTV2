import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

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
            <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
                <div className="text-lg text-[#cccccc] animate-pulse">Загрузка...</div>
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
        <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-6">
                {/* Заголовок */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[#007acc] to-[#1a8cd8] bg-clip-text text-transparent mb-2">
                        Создать аккаунт
                    </h1>
                    <p className="text-sm text-[#858585]">
                        Или{' '}
                        <Link
                            to="/auth/login"
                            className="font-medium text-[#007acc] hover:text-[#1a8cd8] transition-colors"
                        >
                            войдите в существующий
                        </Link>
                    </p>
                </div>

                {/* Форма */}
                <Card className="w-full">
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-[#cccccc]">Данные для регистрации</h3>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-[#f48771]/10 border border-[#f48771]/50 rounded-lg p-4">
                                    <p className="text-sm text-[#f48771] flex items-center gap-2">
                                        <span>⚠</span>
                                        {error}
                                    </p>
                                </div>
                            )}

                            <Input
                                label="Имя пользователя"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Придумайте имя пользователя"
                            />

                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="your@email.com"
                            />

                            <Input
                                label="Пароль"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Не менее 6 символов"
                            />

                            <Input
                                label="Подтвердите пароль"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                placeholder="Повторите пароль"
                            />

                            <Input
                                label="Токен подтверждения"
                                name="verificationToken"
                                type="text"
                                value={formData.verificationToken}
                                onChange={handleChange}
                                required
                                placeholder="Из письма после регистрации"
                            />

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};