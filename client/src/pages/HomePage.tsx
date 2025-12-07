// HomePage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { ServiceCard } from '../features/services/components/ServiceCard';
import { useServices } from '../features/services/hooks/useServices';
import { CategoriesSection } from '../components/categories/CategoriesSection';
import '../assets/styles/HomePage.css'

const ITEMS_PER_BATCH = 9;

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { services: allServices, isLoading, error, refresh } = useServices();
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);

    const handleCategoryClick = useCallback((searchQuery: string, categoryName: string) => {
        // Переход на страницу услуг с параметрами категории
        navigate(`/services?category=${encodeURIComponent(searchQuery)}&name=${encodeURIComponent(categoryName)}`);
    }, [navigate]);

    const filteredServices = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return allServices;
        }
        
        return allServices.filter(service => {
            // Получаем тэги услуги
            const serviceTags = (service.tags || [])
                .map(tag => tag.title.toLowerCase());
            
            // Поиск по названию и описанию
            const searchableText = [service.title, service.description]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            
            // Проверяем совпадение в тэгах (точное или частичное)
            const tagMatch = serviceTags.some(tag => 
                tag === query || tag.includes(query) || query.includes(tag)
            );
            
            // Проверяем совпадение в тексте
            const textMatch = searchableText.includes(query);
            
            return tagMatch || textMatch;
        });
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
                        <h1 className="hero-title">
                            Найдите нужную услугу
                        </h1>

                        <p className="hero-description">
                            Каталог услуг от проверенных специалистов
                        </p>

                        <div className="search-container">
                            <div className="search-wrapper">
                                <div className="search-glow" />
                                <Input
                                    placeholder="Поиск по услугам и категориям..."
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

            {/* Categories Section */}
            <CategoriesSection onCategoryClick={handleCategoryClick} />

            {/* Services Section */}
            <section className="services-section container">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">
                            Услуги
                        </h2>
                        <p className="section-subtitle">
                            {filteredServices.length} {filteredServices.length === 1 ? 'услуга' : filteredServices.length < 5 ? 'услуги' : 'услуг'}
                        </p>
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
                                Ничего не найдено
                            </h3>
                            <p className="empty-description">
                                {search 
                                    ? 'Попробуйте другой запрос'
                                    : 'Каталог пуст'
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
                                Загрузка...
                            </span>
                        </div>
                    </div>
                )}

                {!hasMore && visibleServices.length > 0 && (
                    <div className="end-results">
                        <div className="end-badge">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="end-text">
                                Показано {filteredServices.length} {filteredServices.length === 1 ? 'услуга' : filteredServices.length < 5 ? 'услуги' : 'услуг'}
                            </span>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};