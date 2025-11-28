import React, { useState } from 'react';
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

    const { login } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(formData);
            navigate('/'); // Редирект на главную после успешного входа
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Ошибка входа');
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
                <p className="mt-2 text-sm text-gray-600">
                    Нет аккаунта?{' '}
                    <Link
                        to="/auth/register"
                        className="font-medium text-blue-600 hover:text-blue-500"
                    >
                        Зарегистрируйтесь
                    </Link>
                </p>

                {/* Форма */}
                <Card className="w-full">
                    <CardHeader>
                        <h3 className="text-lg font-medium text-gray-900">Данные для входа</h3>
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