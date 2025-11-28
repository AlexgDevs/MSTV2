import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ServiceCard } from '../features/services/components/ServiceCard';
import { useServices } from '../features/services/hooks/useServices';

const ITEMS_PER_BATCH = 6;

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
                { rootMargin: '200px' }
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
        <div className="space-y-10">
            <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <p className="text-sm uppercase tracking-wider text-blue-600 font-semibold mb-2">
                    Каталог услуг
                </p>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Найдите мастера под свою задачу
                </h1>
                <p className="text-lg text-gray-600 max-w-3xl mb-6">
                    Мы собрали проверенных специалистов и их услуги в одной ленте.
                    Используйте поиск, чтобы быстро найти нужное направление, и
                    листайте карточки — новые услуги подгружаются по мере просмотра.
                </p>

                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <Input
                        placeholder="Например: массаж, маникюр, барбер"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            type="button"
                            className="w-full md:w-auto"
                            disabled={isLoading}
                            onClick={() => refresh()}
                        >
                            Обновить
                        </Button>
                        <Button
                            type="button"
                            className="w-full md:w-auto"
                            onClick={handleLoadMore}
                            disabled={!hasMore}
                        >
                            Подгрузить ещё
                        </Button>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900">
                            Доступные услуги
                        </h2>
                        <p className="text-gray-500">
                            {filteredServices.length} предложений
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                        <p className="text-red-700 mb-4">
                            Не удалось загрузить услуги: {error}
                        </p>
                        <Button onClick={() => refresh()} disabled={isLoading}>
                            Попробовать снова
                        </Button>
                    </div>
                )}

                {isInitialLoading && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: ITEMS_PER_BATCH }).map((_, index) => (
                            <div
                                key={index}
                                className="h-80 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"
                            />
                        ))}
                    </div>
                )}

                {!isInitialLoading && visibleServices.length === 0 && !error && (
                    <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
                        <p className="text-lg text-gray-600 mb-3">
                            Пока что нет услуг, подходящих под ваш запрос
                        </p>
                        <p className="text-sm text-gray-500">
                            Попробуйте изменить поисковую фразу или сбросьте фильтр
                        </p>
                    </div>
                )}

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleServices.map(service => (
                        <ServiceCard key={service.id} service={service} />
                    ))}
                </div>

                {hasMore && !isInitialLoading && (
                    <div
                        ref={loadMoreRef}
                        className="flex justify-center py-6 text-sm text-gray-500"
                    >
                        Прокрутите ниже, чтобы увидеть больше
                    </div>
                )}
            </section>
        </div>
    );
};
