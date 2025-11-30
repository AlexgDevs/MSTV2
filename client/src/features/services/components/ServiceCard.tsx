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
    const hasPhoto = service.photo && !service.photo.includes('placehold.co');

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
        return null;
    }, [service.photo]);

    const description =
        service.description.length > 120
            ? `${service.description.slice(0, 117)}...`
            : service.description;

    return (
        <Card className="service-card">
            {/* Image Section or Title Placeholder */}
            <div className="service-image">
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={service.title}
                        className="service-image-img"
                        loading="lazy"
                    />
                ) : (
                    <div className="service-title-placeholder">
                        <span className="service-title-text">{service.title}</span>
                    </div>
                )}
                <div className="service-price-badge">
                    <svg className="service-price-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {priceFormatter.format(service.price)}
                </div>
            </div>

            <CardContent className="service-content">
                {/* Header - Only show title if we have photo */}
                {coverImage && (
                    <div className="service-header">
                        <h3 className="service-title">
                            {service.title}
                        </h3>
                        <span className="service-id">
                            #{service.id}
                        </span>
                    </div>
                )}

                {/* Description */}
                {service.description && (
                    <p className="service-description">
                        {description}
                    </p>
                )}

                {/* Footer */}
                <div className="service-footer">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelect?.(service)}
                        className="service-action-btn"
                    >
                        <span className="flex items-center gap-1.5">
                            Подробнее
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};