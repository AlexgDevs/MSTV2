import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../utils/cn';

export const Header: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/auth/login');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <header className="sticky top-0 z-50 bg-[#252526] border-b border-[#3e3e42] backdrop-blur-md bg-opacity-95 shadow-lg">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex justify-between items-center h-14">
                    {/* Логотип и навигация */}
                    <div className="flex items-center gap-8">
                        <Link
                            to="/"
                            className="text-xl font-bold bg-gradient-to-r from-[#007acc] to-[#1a8cd8] bg-clip-text text-transparent hover:from-[#1a8cd8] hover:to-[#007acc] transition-all duration-300"
                        >
                            Услуги
                        </Link>

                        {isAuthenticated && (
                            <nav className="flex items-center gap-1">
                                <Link
                                    to="/services"
                                    className={cn(
                                        'px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                                        isActive('/services')
                                            ? 'bg-[#094771] text-white'
                                            : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                                    )}
                                >
                                    Услуги
                                </Link>
                                <Link
                                    to="/profile"
                                    className={cn(
                                        'px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                                        isActive('/profile')
                                            ? 'bg-[#094771] text-white'
                                            : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                                    )}
                                >
                                    Профиль
                                </Link>
                                <Link
                                    to="/master"
                                    className={cn(
                                        'px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                                        isActive('/master')
                                            ? 'bg-[#094771] text-white'
                                            : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                                    )}
                                >
                                    Мастерская
                                </Link>
                            </nav>
                        )}
                    </div>

                    {/* Правая часть */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                {/* Информация пользователя */}
                                <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#2a2d2e] transition-colors cursor-pointer">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-[#cccccc] leading-tight">
                                            {user?.name}
                                        </p>
                                        <p className="text-xs text-[#858585] leading-tight">
                                            {user?.role}
                                        </p>
                                    </div>
                                    <div className="w-9 h-9 bg-gradient-to-br from-[#007acc] to-[#1a8cd8] rounded-full flex items-center justify-center shadow-lg">
                                        <span className="text-white text-sm font-semibold">
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* Кнопка выхода */}
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 rounded-md text-sm font-medium text-[#cccccc] bg-[#2d2d30] border border-[#3e3e42] hover:bg-[#3e3e42] hover:border-[#464647] transition-all duration-200"
                                >
                                    Выйти
                                </button>
                            </>
                        ) : (
                            /* Кнопки входа/регистрации */
                            <div className="flex gap-3">
                                <Link
                                    to="/auth/login"
                                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-[#007acc] hover:bg-[#1a8cd8] hover:shadow-lg hover:shadow-[#007acc]/30 transition-all duration-200"
                                >
                                    Войти
                                </Link>
                                <Link
                                    to="/auth/register"
                                    className="px-4 py-2 rounded-md text-sm font-medium text-[#cccccc] border border-[#3e3e42] hover:bg-[#2a2d2e] hover:border-[#464647] transition-all duration-200"
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