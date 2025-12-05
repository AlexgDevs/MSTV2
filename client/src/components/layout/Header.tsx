import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../utils/cn';
import { UserIcon, SettingsIcon, LogoutIcon } from '../icons/Icons';
import '../../assets/styles/Header.css';

export const Header: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleLogout = async () => {
        await logout();
        navigate('/auth/login');
        setIsDropdownOpen(false);
    };

    const isActive = (path: string) => location.pathname === path;

    // Закрытие меню при клике вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                triggerRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Закрытие меню при нажатии Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    // Закрытие меню при переходе на другую страницу
    useEffect(() => {
        setIsDropdownOpen(false);
    }, [location.pathname]);

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-content">
                    {/* Логотип и навигация */}
                    <div className="header-left">
                        <Link to="/" className="header-logo">
                            Главная
                        </Link>

                        {isAuthenticated && (
                            <nav className="header-nav">
                                <Link
                                    to="/services"
                                    className={cn('nav-link', isActive('/services') && 'active')}
                                >
                                    Услуги
                                </Link>
                                <Link
                                    to="/profile"
                                    className={cn('nav-link', isActive('/profile') && 'active')}
                                >
                                    Профиль
                                </Link>
                                <Link
                                    to="/master"
                                    className={cn('nav-link', isActive('/master') && 'active')}
                                >
                                    Мастерская
                                </Link>
                            </nav>
                        )}
                    </div>

                    {/* Правая часть */}
                    <div className="header-right">
                        {isAuthenticated ? (
                            <div className="user-menu">
                                <button
                                    ref={triggerRef}
                                    className="user-trigger"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    aria-label="Меню пользователя"
                                    aria-expanded={isDropdownOpen}
                                >
                                    <span className="user-avatar">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </button>

                                <div 
                                    ref={dropdownRef}
                                    className={cn('user-dropdown', isDropdownOpen && 'active')}
                                >
                                    {/* Информация пользователя */}
                                    <div className="user-info">
                                        <div className="user-details">
                                            <div className="user-info-avatar">
                                                <span className="user-info-initial">
                                                    {user?.name?.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="user-info-text">
                                                <div className="user-info-name">{user?.name}</div>
                                                <div className="user-info-role">{user?.role}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Меню */}
                                    <div className="menu-items">
                                        <Link 
                                            to="/profile" 
                                            className={cn('menu-item', isActive('/profile') && 'active')}
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <span className="menu-icon">
                                                <UserIcon size={20} />
                                            </span>
                                            <span className="menu-label">Профиль</span>
                                        </Link>
                                        <Link 
                                            to="/master" 
                                            className={cn('menu-item', isActive('/master') && 'active')}
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <span className="menu-icon">
                                                <SettingsIcon size={20} />
                                            </span>
                                            <span className="menu-label">Мастерская</span>
                                        </Link>
                                        <Link 
                                            to="/settings" 
                                            className={cn('menu-item', isActive('/settings') && 'active')}
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <span className="menu-icon">
                                                <SettingsIcon size={20} />
                                            </span>
                                            <span className="menu-label">Настройки</span>
                                        </Link>
                                        
                                        <div className="menu-divider" />
                                        
                                        <button 
                                            className="btn-logout"
                                            onClick={handleLogout}
                                        >
                                            <span className="logout-icon">
                                                <LogoutIcon size={20} />
                                            </span>
                                            <span>Выйти</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Кнопки входа/регистрации */
                            <div className="auth-buttons">
                                <Link to="/auth/login" className="btn-login">
                                    Войти
                                </Link>
                                <Link to="/auth/register" className="btn-register">
                                    Регистрация
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Оверлей для закрытия меню */}
            {isDropdownOpen && (
                <div 
                    className="dropdown-overlay active"
                    onClick={() => setIsDropdownOpen(false)}
                />
            )}
        </header>
    );
};