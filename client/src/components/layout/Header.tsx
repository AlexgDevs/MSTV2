import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

export const Header: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/auth/login');
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Логотип и навигация */}
                    <div className="flex items-center space-x-8">
                        <Link
                            to="/"
                            className="text-xl font-bold text-gray-900 hover:text-blue-600"
                        >
                            Услуги
                        </Link>

                        {isAuthenticated && (
                            <nav className="flex space-x-6">
                                <Link
                                    to="/services"
                                    className="text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    Услуги
                                </Link>
                                <Link
                                    to="/profile"
                                    className="text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    Профиль
                                </Link>
                                <Link
                                    to="/master"
                                    className="text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    Мастерская
                                </Link>
                            </nav>
                        )}
                    </div>

                    {/* Правая часть */}
                    <div className="flex items-center space-x-4">
                        {isAuthenticated ? (
                            <>
                                {/* Информация пользователя */}
                                <div className="flex items-center space-x-3">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {user?.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {user?.role}
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-medium">
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* Кнопка выхода */}
                                <button
                                    onClick={handleLogout}
                                    className="bg-gray-100 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors text-sm"
                                >
                                    Выйти
                                </button>
                            </>
                        ) : (
                            /* Кнопки входа/регистрации */
                            <div className="flex space-x-3">
                                <Link
                                    to="/auth/login"
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Войти
                                </Link>
                                <Link
                                    to="/auth/register"
                                    className="border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Регистрация
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};