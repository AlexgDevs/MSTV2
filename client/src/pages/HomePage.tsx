// HomePage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ServiceCard } from '../features/services/components/ServiceCard';
import { useServices } from '../features/services/hooks/useServices';
import '../assets/styles/HomePage.css'

const ITEMS_PER_BATCH = 9;

export const HomePage: React.FC = () => {
    const { services: allServices, isLoading, error, refresh } = useServices();
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);

    const filteredServices = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return allServices;
        }

        return allServices.filter(service =>
            [service.title, service.description]
                .filter(Boolean)
                .some(field => field.toLowerCase().includes(query))
        );
    }, [allServices, search]);

    useEffect(() => {
        setVisibleCount(ITEMS_PER_BATCH);
    }, [filteredServices.length]);

    const hasMore = visibleCount < filteredServices.length;
    const visibleServices = filteredServices.slice(0, visibleCount);

    const handleLoadMore = useCallback(() => {
        if (!hasMore) {
            return;
        }
        setVisibleCount(prev =>
            Math.min(prev + ITEMS_PER_BATCH, filteredServices.length)
        );
    }, [filteredServices.length, hasMore]);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }

            if (!node || !hasMore || isLoading) {
                return;
            }

            observerRef.current = new IntersectionObserver(
                entries => {
                    if (entries[0]?.isIntersecting) {
                        handleLoadMore();
                    }
                },
                { rootMargin: '100px' }
            );

            observerRef.current.observe(node);
        },
        [handleLoadMore, hasMore, isLoading]
    );

    useEffect(() => {
        return () => observerRef.current?.disconnect();
    }, []);

    const isInitialLoading = isLoading && allServices.length === 0;

    return (
        <div className="homepage">
            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="text-center">
                        <div className="hero-badge">
                            <div className="hero-pulse" />
                            <span className="text-sm font-medium text-[#A0A0A0] tracking-wide">
                                КАТАЛОГ УСЛУГ
                            </span>
                        </div>

                        <h1 className="hero-title">
                            <span className="hero-title-gradient">
                                Найдите идеального
                            </span>
                            <br />
                            <span className="hero-title-accent">
                                мастера
                            </span>
                        </h1>

                        <p className="hero-description mx-auto">
                            Платформа, где талант встречает возможность. 
                            Откройте для себя уникальные услуги от проверенных специалистов 
                            в современном цифровом пространстве.
                        </p>

                        <div className="search-container">
                            <div className="search-wrapper">
                                <div className="search-glow" />
                                <Input
                                    placeholder="Поиск услуг: дизайн, разработка, маркетинг..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="search-input"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="search-clear"
                                        aria-label="Очистить поиск"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="gradient-orb-top" />
                <div className="gradient-orb-bottom" />
            </section>

            {/* Services Section */}
            <section className="services-section container">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">
                            Доступные услуги
                        </h2>
                        <div className="services-count">
                            <span className="count-badge">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span>{filteredServices.length} услуг</span>
                            </span>
                            <span className="text-[#666]">в каталоге</span>
                        </div>
                    </div>

                    <div className="actions">
                        <button
                            className="btn-outline"
                            onClick={refresh}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Обновление...
                                </span>
                            ) : (
                                'Обновить'
                            )}
                        </button>
                        
                        {hasMore && (
                            <button
                                className="btn-primary"
                                onClick={handleLoadMore}
                                disabled={!hasMore}
                            >
                                Показать ещё
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error-state">
                        <div className="error-content">
                            <div className="error-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div className="error-text">
                                <p className="error-title">
                                    Ошибка загрузки
                                </p>
                                <p className="error-description">
                                    {error}
                                </p>
                                <button 
                                    className="btn-outline"
                                    onClick={() => refresh()} 
                                    disabled={isLoading}
                                >
                                    Попробовать снова
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isInitialLoading && (
                    <div className="skeleton-grid">
                        {Array.from({ length: ITEMS_PER_BATCH }).map((_, index) => (
                            <div
                                key={index}
                                className="skeleton-card"
                            />
                        ))}
                    </div>
                )}

                {!isInitialLoading && visibleServices.length === 0 && !error && (
                    <div className="empty-state">
                        <div className="relative z-10">
                            <div className="empty-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="empty-title">
                                Услуги не найдены
                            </h3>
                            <p className="empty-description">
                                {search 
                                    ? 'Попробуйте изменить запрос или очистить фильтры'
                                    : 'Каталог услуг пока пуст. Возвращайтесь позже!'
                                }
                            </p>
                            {search && (
                                <button
                                    className="btn-outline"
                                    onClick={() => setSearch('')}
                                >
                                    Очистить поиск
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="services-grid">
                    {visibleServices.map((service, index) => (
                        <div
                            key={service.id}
                            className="service-item"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <ServiceCard service={service} />
                        </div>
                    ))}
                </div>

                {hasMore && !isInitialLoading && (
                    <div
                        ref={loadMoreRef}
                        className="load-more"
                    >
                        <div className="loading-indicator">
                            <div className="spinner" />
                            <span className="loading-text">
                                Загружаем больше возможностей...
                            </span>
                        </div>
                        <p className="loading-hint">
                            Прокрутите для автоматической загрузки
                        </p>
                    </div>
                )}

                {!hasMore && visibleServices.length > 0 && (
                    <div className="end-results">
                        <div className="end-badge">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="end-text">
                                Вы просмотрели все {filteredServices.length} услуг
                            </span>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};