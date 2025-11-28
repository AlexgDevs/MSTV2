import React, { useState } from 'react';
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

    const { register } = useAuthStore();
    const navigate = useNavigate();

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
            setError(err.response?.data?.detail || 'Ошибка регистрации');
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Заголовок */}
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Создать аккаунт
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Или{' '}
                        <Link
                            to="/auth/login"
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            войдите в существующий
                        </Link>
                    </p>
                </div>

                {/* Форма */}
                <Card className="w-full">
                    <CardHeader>
                        <h3 className="text-lg font-medium text-gray-900">Данные для регистрации</h3>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm text-red-600">{error}</p>
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