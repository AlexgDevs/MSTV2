import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryCard } from './CategoryCard';
import type { Category } from './CategoryCard';
import { BeautyIcon, TechIcon, EducationIcon, RepairIcon, CreativeIcon, BusinessIcon } from '../icons/Icons';
import './CategoriesSection.css';

const CATEGORIES: (Category & { size: 'small' | 'medium' | 'large'; iconComponent: React.ComponentType<{ className?: string; size?: number }>; backgroundImage: string })[] = [
    {
        id: 'beauty',
        title: 'Красота и здоровье',
        searchQuery: 'красота здоровье парикмахер маникюр массаж косметология',
        gradient: '', // Оставляем для обратной совместимости
        icon: '',
        iconComponent: BeautyIcon,
        size: 'large',
        backgroundImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80'
    },
    {
        id: 'it',
        title: 'IT и технологии',
        searchQuery: 'разработка дизайн программирование IT технологии',
        gradient: '',
        icon: '',
        iconComponent: TechIcon,
        size: 'large',
        backgroundImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'
    },
    {
        id: 'education',
        title: 'Образование и консультации',
        searchQuery: 'образование репетитор консультация обучение',
        gradient: '',
        icon: '',
        iconComponent: EducationIcon,
        size: 'medium',
        backgroundImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'
    },
    {
        id: 'repair',
        title: 'Ремонт и обслуживание',
        searchQuery: 'ремонт уборка обслуживание установка',
        gradient: '',
        icon: '',
        iconComponent: RepairIcon,
        size: 'medium',
        backgroundImage: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80'
    },
    {
        id: 'creative',
        title: 'Творчество и хобби',
        searchQuery: 'творчество фотография музыка рукоделие',
        gradient: '',
        icon: '',
        iconComponent: CreativeIcon,
        size: 'medium',
        backgroundImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80'
    },
    {
        id: 'business',
        title: 'Бизнес и маркетинг',
        searchQuery: 'бизнес маркетинг консультация SMM копирайтинг',
        gradient: '',
        icon: '',
        iconComponent: BusinessIcon,
        size: 'small',
        backgroundImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'
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
                    {CATEGORIES.map((category) => {
                        const { iconComponent, backgroundImage, ...categoryData } = category;
                        return (
                            <CategoryCard
                                key={category.id}
                                category={{ ...categoryData, iconComponent, backgroundImage }}
                                size={category.size}
                                onClick={() => handleCategoryClick(category)}
                            />
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

