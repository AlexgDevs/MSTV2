import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

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
            <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
                <div className="text-lg text-[#cccccc] animate-pulse">Загрузка...</div>
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
        <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-6">
                {/* Заголовок */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[#007acc] to-[#1a8cd8] bg-clip-text text-transparent mb-2">
                        Вход в систему
                    </h1>
                    <p className="text-sm text-[#858585]">
                        Нет аккаунта?{' '}
                        <Link
                            to="/auth/register"
                            className="font-medium text-[#007acc] hover:text-[#1a8cd8] transition-colors"
                        >
                            Зарегистрируйтесь
                        </Link>
                    </p>
                </div>

                {/* Форма */}
                <Card className="w-full">
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-[#cccccc]">Данные для входа</h3>
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
                                placeholder="Введите ваше имя"
                            />

                            <Input
                                label="Пароль"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Введите пароль"
                            />

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? 'Вход...' : 'Войти'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};