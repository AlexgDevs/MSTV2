import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { ServiceResponse } from '../../../types/service.types';

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
});

interface ServiceCardProps {
    service: ServiceResponse;
    onSelect?: (service: ServiceResponse) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onSelect }) => {
    const coverImage = React.useMemo(() => {
        if (service.photo?.startsWith('http')) {
            return service.photo;
        }
        if (service.photo?.startsWith('data:') || service.photo?.startsWith('blob:')) {
            return service.photo;
        }
        if (service.photo) {
            const baseStatic =
                import.meta.env.VITE_STATIC_URL ||
                import.meta.env.VITE_API_URL?.replace('/api/v1', '') ||
                '';
            return `${baseStatic}${service.photo}`;
        }
        return `https://placehold.co/600x400?text=${encodeURIComponent(service.title)}`;
    }, [service.photo, service.title]);

    const description =
        service.description.length > 160
            ? `${service.description.slice(0, 157)}...`
            : service.description;

    return (
        <Card className="overflow-hidden flex flex-col h-full">
            <div className="relative h-48 bg-gray-100">
                <img
                    src={coverImage}
                    alt={service.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                <span className="absolute top-3 left-3 bg-white/90 text-gray-900 text-sm font-semibold px-3 py-1 rounded-full shadow-sm">
                    {priceFormatter.format(service.price)}
                </span>
            </div>

            <CardContent className="flex flex-col flex-1 gap-4">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {service.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3">
                        {description}
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">ID: {service.id}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelect?.(service)}
                    >
                        Подробнее
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
