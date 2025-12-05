import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryCard } from './CategoryCard';
import type { Category } from './CategoryCard';
import './CategoriesSection.css';

const CATEGORIES: (Category & { size: 'small' | 'medium' | 'large' })[] = [
    {
        id: 'beauty',
        title: 'Красота и здоровье',
        searchQuery: 'красота здоровье парикмахер маникюр массаж косметология',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        icon: '💅',
        size: 'large'
    },
    {
        id: 'it',
        title: 'IT и технологии',
        searchQuery: 'разработка дизайн программирование IT технологии',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        icon: '💻',
        size: 'large'
    },
    {
        id: 'education',
        title: 'Образование и консультации',
        searchQuery: 'образование репетитор консультация обучение',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        icon: '📚',
        size: 'medium'
    },
    {
        id: 'repair',
        title: 'Ремонт и обслуживание',
        searchQuery: 'ремонт уборка обслуживание установка',
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        icon: '🔧',
        size: 'medium'
    },
    {
        id: 'creative',
        title: 'Творчество и хобби',
        searchQuery: 'творчество фотография музыка рукоделие',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        icon: '🎨',
        size: 'medium'
    },
    {
        id: 'business',
        title: 'Бизнес и маркетинг',
        searchQuery: 'бизнес маркетинг консультация SMM копирайтинг',
        gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        icon: '📊',
        size: 'small'
    }
];

interface CategoriesSectionProps {
    onCategoryClick?: (searchQuery: string, categoryName: string) => void;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({ onCategoryClick }) => {
    const navigate = useNavigate();

    const handleCategoryClick = (category: typeof CATEGORIES[0]) => {
        if (onCategoryClick) {
            onCategoryClick(category.searchQuery, category.title);
        } else {
            // Переход на страницу услуг с параметрами категории
            navigate(`/services?category=${encodeURIComponent(category.searchQuery)}&name=${encodeURIComponent(category.title)}`);
        }
    };

    return (
        <section className="categories-section">
            <div className="container">
                <div className="categories-header">
                    <h2 className="categories-title">Популярные категории</h2>
                    <p className="categories-subtitle">Выберите интересующую вас категорию услуг</p>
                </div>
                <div className="categories-grid">
                    {CATEGORIES.map((category) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            size={category.size}
                            onClick={() => handleCategoryClick(category)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

