import React from 'react';
import './CategoryCard.css';

export interface Category {
    id: string;
    title: string;
    searchQuery: string;
    gradient: string;
    icon: string;
    iconComponent?: React.ComponentType<{ className?: string; size?: number; color?: string }>;
    backgroundImage?: string;
}

interface CategoryCardProps {
    category: Category;
    size?: 'small' | 'medium' | 'large';
    onClick: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, size = 'medium', onClick }) => {
    const IconComponent = category.iconComponent;
    const iconSize = size === 'small' ? 32 : size === 'medium' ? 40 : 48;
    
    const backgroundStyle = category.backgroundImage 
        ? {
            backgroundImage: `url(${category.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }
        : {
            background: category.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        };
    
    return (
        <div 
            className={`category-card category-card-${size}`}
            onClick={onClick}
        >
            {category.backgroundImage && (
                <div 
                    className="category-background-image"
                    style={{
                        backgroundImage: `url(${category.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                />
            )}
            {!category.backgroundImage && (
                <div 
                    className="category-background-gradient"
                    style={{ background: category.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                />
            )}
            <div className="category-overlay" />
            <div className="category-background-gradient" style={{ background: 'var(--color-gray-100, #F5F5F5)' }} />
            <div className="category-content">
                <div className="category-icon">
                    {IconComponent ? (
                        <IconComponent size={iconSize} color="#ffffff" className="category-icon-svg" />
                    ) : (
                        <span className="category-icon-emoji">{category.icon}</span>
                    )}
                </div>
                <h3 className="category-title">{category.title}</h3>
            </div>
        </div>
    );
};

