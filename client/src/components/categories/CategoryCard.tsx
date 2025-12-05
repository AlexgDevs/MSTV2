import React from 'react';
import './CategoryCard.css';

export interface Category {
    id: string;
    title: string;
    searchQuery: string;
    gradient: string;
    icon: string;
}

interface CategoryCardProps {
    category: Category;
    size?: 'small' | 'medium' | 'large';
    onClick: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, size = 'medium', onClick }) => {
    return (
        <div 
            className={`category-card category-card-${size}`}
            onClick={onClick}
            style={{ 
                background: category.gradient,
            }}
        >
            <div className="category-overlay" />
            <div className="category-content">
                <div className="category-icon">
                    {category.icon}
                </div>
                <h3 className="category-title">{category.title}</h3>
            </div>
        </div>
    );
};

