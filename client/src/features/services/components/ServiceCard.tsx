import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
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

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
    const navigate = useNavigate();
    
    // Получаем до 5 тэгов
    const displayTags = (service.tags || []).slice(0, 5);
    
    const handleTagClick = (e: React.MouseEvent, tagTitle: string) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/services?category=${encodeURIComponent(tagTitle)}&name=${encodeURIComponent(tagTitle)}`);
    };

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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    {priceFormatter.format(service.price)}
                </div>
            </div>

            <CardContent className="service-content">
                {/* Header - Title */}
                <div className="service-header">
                    <h3 className="service-title">
                        {service.title}
                    </h3>
                    <span className="service-id">
                        #{service.id}
                    </span>
                </div>

                {/* Tags */}
                {displayTags.length > 0 && (
                    <div className="service-tags">
                        {displayTags.map((tag) => (
                            <button
                                key={tag.id}
                                onClick={(e) => handleTagClick(e, tag.title)}
                                className="service-tag"
                                type="button"
                            >
                                #{tag.title}
                            </button>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="service-footer">
                    <Link
                        to={`/services/${service.id}`}
                        className="service-action-btn"
                    >
                        Подробнее
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};