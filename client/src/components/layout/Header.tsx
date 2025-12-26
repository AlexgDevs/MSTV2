import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../utils/cn';
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
                        <Link to="/" className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                            Главная
                        </Link>

                        {isAuthenticated && (
                            <nav className="header-nav">
                                <Link
                                    to="/services"
                                    className={cn('nav-link', isActive('/services') && 'active')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="7" height="7"/>
                                        <rect x="14" y="3" width="7" height="7"/>
                                        <rect x="14" y="14" width="7" height="7"/>
                                        <rect x="3" y="14" width="7" height="7"/>
                                    </svg>
                                    Услуги
                                </Link>
                                <Link
                                    to="/profile"
                                    className={cn('nav-link', isActive('/profile') && 'active')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    Профиль
                                </Link>
                                <Link
                                    to="/chats"
                                    className={cn('nav-link', isActive('/chats') && 'active')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    Чаты
                                </Link>
                                <Link
                                    to="/master"
                                    className={cn('nav-link', isActive('/master') && 'active')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                    </svg>
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
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                    <circle cx="12" cy="7" r="4"/>
                                                </svg>
                                            </span>
                                            <span className="menu-label">Профиль</span>
                                        </Link>
                                        <Link 
                                            to="/master" 
                                            className={cn('menu-item', isActive('/master') && 'active')}
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <span className="menu-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                                </svg>
                                            </span>
                                            <span className="menu-label">Мастерская</span>
                                        </Link>
                                        <Link 
                                            to="/settings" 
                                            className={cn('menu-item', isActive('/settings') && 'active')}
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <span className="menu-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="3"/>
                                                    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                                                </svg>
                                            </span>
                                            <span className="menu-label">Настройки</span>
                                        </Link>
                                        
                                        <div className="menu-divider" />
                                        
                                        <button 
                                            className="btn-logout"
                                            onClick={handleLogout}
                                        >
                                            <span className="logout-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                                    <polyline points="16 17 21 12 16 7"/>
                                                    <line x1="21" y1="12" x2="9" y2="12"/>
                                                </svg>
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