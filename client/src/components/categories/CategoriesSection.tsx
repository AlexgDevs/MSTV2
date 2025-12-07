import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryCard } from './CategoryCard';
import type { Category } from './CategoryCard';
import { BeautyIcon, TechIcon, EducationIcon, RepairIcon, CreativeIcon, BusinessIcon } from '../icons/Icons';
import './CategoriesSection.css';

export const CATEGORIES: (Category & { size: 'small' | 'medium' | 'large'; iconComponent: React.ComponentType<{ className?: string; size?: number }>; backgroundImage: string })[] = [
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [activeCardIndex, setActiveCardIndex] = useState(0);

    const handleCategoryClick = (category: typeof CATEGORIES[0]) => {
        if (onCategoryClick) {
            // Используем название категории как тэг для поиска
            onCategoryClick(category.title, category.title);
        } else {
            // Переход на страницу услуг с параметрами категории (используем название как тэг)
            navigate(`/services?category=${encodeURIComponent(category.title)}&name=${encodeURIComponent(category.title)}`);
        }
    };

    const findActiveCard = () => {
        if (!scrollContainerRef.current) return;
        
        const container = scrollContainerRef.current;
        const containerCenter = container.clientWidth / 2;
        const scrollLeft = container.scrollLeft;
        const centerPoint = scrollLeft + containerCenter;

        let closestIndex = 0;
        let closestDistance = Infinity;

        cardRefs.current.forEach((card, index) => {
            if (card) {
                const cardRect = card.getBoundingClientRect();
                const cardCenter = cardRect.left - container.getBoundingClientRect().left + cardRect.width / 2;
                const distance = Math.abs(centerPoint - (scrollLeft + cardCenter));

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = index;
                }
            }
        });

        setActiveCardIndex(closestIndex);
    };

    const checkScrollButtons = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
        findActiveCard();
    };

    useEffect(() => {
        // Небольшая задержка для правильной инициализации после рендера
        const timer = setTimeout(() => {
            checkScrollButtons();
        }, 100);
        
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollButtons);
            window.addEventListener('resize', checkScrollButtons);
            return () => {
                clearTimeout(timer);
                container.removeEventListener('scroll', checkScrollButtons);
                window.removeEventListener('resize', checkScrollButtons);
            };
        }
        
        return () => clearTimeout(timer);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current && cardRefs.current.length > 0) {
            const container = scrollContainerRef.current;
            const containerCenter = container.clientWidth / 2;
            const currentScroll = container.scrollLeft;
            
            // Находим текущую активную карточку
            let targetIndex = activeCardIndex;
            
            if (direction === 'right' && targetIndex < CATEGORIES.length - 1) {
                targetIndex = targetIndex + 1;
            } else if (direction === 'left' && targetIndex > 0) {
                targetIndex = targetIndex - 1;
            }
            
            const targetCard = cardRefs.current[targetIndex];
            if (targetCard) {
                const cardRect = targetCard.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const cardCenter = cardRect.left - containerRect.left + cardRect.width / 2;
                const scrollOffset = cardCenter - containerCenter;
                
                container.scrollTo({
                    left: currentScroll + scrollOffset,
                    behavior: 'smooth'
                });
            }
        }
    };

    return (
        <section className="categories-section">
            <div className="container">
                <div className="categories-header">
                    <h2 className="categories-title">Категории</h2>
                </div>
                <div 
                    className={`categories-scroll-wrapper ${canScrollLeft ? 'has-scroll-left' : ''} ${canScrollRight ? 'has-scroll-right' : ''}`}
                >
                    {canScrollLeft && (
                        <button 
                            className="categories-scroll-btn categories-scroll-btn-left"
                            onClick={() => scroll('left')}
                            aria-label="Прокрутить влево"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                    )}
                    <div 
                        className="categories-scroll-container"
                        ref={scrollContainerRef}
                        onScroll={checkScrollButtons}
                    >
                        <div className="categories-grid">
                            {CATEGORIES.map((category, index) => {
                                const { iconComponent, backgroundImage, ...categoryData } = category;
                                return (
                                    <div
                                        key={category.id}
                                        ref={(el) => { cardRefs.current[index] = el; }}
                                        className={`category-card-wrapper ${index === activeCardIndex ? 'active' : ''}`}
                                    >
                                        <CategoryCard
                                            category={{ ...categoryData, iconComponent, backgroundImage }}
                                            size="medium"
                                            onClick={() => handleCategoryClick(category)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {canScrollRight && (
                        <button 
                            className="categories-scroll-btn categories-scroll-btn-right"
                            onClick={() => scroll('right')}
                            aria-label="Прокрутить вправо"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

