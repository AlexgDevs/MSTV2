import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { servicesApi } from '../../api/services/services.api';
import { enrollsApi } from '../../api/enrolls/enrolls.api';
import type { DetailServiceResponse } from '../../api/services/types';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../utils/cn';
import '../../assets/styles/ServiceDetailPage.css';

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
});

const formatDate = (value: string) => {
    // Парсим формат dd-mm-YYYY
    const dateMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }
    }
    
    // Если формат не dd-mm-YYYY, пытаемся стандартный парсинг
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

export const ServiceDetailPage: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [service, setService] = useState<DetailServiceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bookingSlot, setBookingSlot] = useState<{ dateId: number; slotTime: string } | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    
    // Состояния для редактирования
    const [isEditing, setIsEditing] = useState(false);
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        price: '',
        photo: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const isOwner = user && service && user.id === service.user_id;

    useEffect(() => {
        const fetchServiceDetail = async () => {
            if (!serviceId) return;

            try {
                setLoading(true);
                setError(null);
                const response = await servicesApi.getDetail(parseInt(serviceId));
                setService(response.data);
            } catch (err: any) {
                setError(err?.response?.data?.detail || 'Не удалось загрузить информацию об услуге');
                console.error('Error fetching service details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchServiceDetail();
    }, [serviceId]);

    const handleBackClick = () => {
        navigate(-1);
    };

    const handleEditClick = () => {
        if (!service) return;
        setEditForm({
            title: service.title,
            description: service.description,
            price: service.price.toString(),
            photo: service.photo || ''
        });
        setIsEditing(true);
        setEditError(null);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm({
            title: '',
            description: '',
            price: '',
            photo: ''
        });
        setEditPhotoFile(null);
        setEditError(null);
    };

    const handleSaveEdit = async () => {
        if (!service || !serviceId) return;

        // Валидация
        if (!editForm.title.trim()) {
            setEditError('Название услуги обязательно');
            return;
        }
        if (!editForm.description.trim()) {
            setEditError('Описание услуги обязательно');
            return;
        }
        const price = parseInt(editForm.price);
        if (isNaN(price) || price <= 0) {
            setEditError('Цена должна быть положительным числом');
            return;
        }

        setIsSaving(true);
        setEditError(null);

        try {
            await servicesApi.update(parseInt(serviceId), {
                title: editForm.title.trim(),
                description: editForm.description.trim(),
                price: price,
                photo: editForm.photo.trim() || null
            }, editPhotoFile || undefined);

            // Обновляем данные услуги
            const response = await servicesApi.getDetail(parseInt(serviceId));
            setService(response.data);
            setIsEditing(false);
        } catch (err: any) {
            setEditError(err?.response?.data?.detail || 'Не удалось обновить услугу');
            console.error('Error updating service:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSlotClick = (dateId: number, slotTime: string, status: string) => {
        if (isOwner) return; // Владелец не может записываться
        if (status !== 'available') return; // Можно записаться только на доступные слоты
        
        setBookingSlot({ dateId, slotTime });
        setBookingError(null);
        setBookingSuccess(false);
    };

    const handleConfirmBooking = async () => {
        if (!bookingSlot || !service || !user) return;

        setIsBooking(true);
        setBookingError(null);
        setBookingSuccess(false);

        try {
            await enrollsApi.create({
                service_id: service.id,
                service_date_id: bookingSlot.dateId,
                slot_time: bookingSlot.slotTime,
                price: service.price
            });
            
            setBookingSuccess(true);
            setBookingSlot(null);
            
            // Обновляем данные услуги
            const response = await servicesApi.getDetail(parseInt(serviceId!));
            setService(response.data);
            
            // Скрываем сообщение об успехе через 3 секунды
            setTimeout(() => setBookingSuccess(false), 3000);
        } catch (err: any) {
            setBookingError(err?.response?.data?.detail || 'Не удалось записаться на услугу');
            console.error('Error booking service:', err);
        } finally {
            setIsBooking(false);
        }
    };

    const handleCancelBooking = () => {
        setBookingSlot(null);
        setBookingError(null);
        setBookingSuccess(false);
    };

    if (loading) {
        return (
            <div className="service-loading">
                <div className="service-loading-content">
                    <div className="service-loading-spinner"></div>
                    <div className="service-loading-text">Загрузка...</div>
                </div>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="service-error">
                <div className="service-error-content">
                    <div className="service-error-card">
                        <div className="service-error-header">
                            <svg className="service-error-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <h3 className="service-error-title">{error || 'Услуга не найдена'}</h3>
                        </div>
                    </div>
                    <button
                        onClick={handleBackClick}
                        className="service-error-button"
                    >
                        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Вернуться назад
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="service-detail-page">
            <div className="service-detail-container">
                {/* Кнопка назад */}
                <button
                    onClick={handleBackClick}
                    className="service-back-button"
                >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Назад
                </button>

                <div className="service-detail-layout">
                    {/* Левая колонка - кнопка редактирования для владельца */}
                    {isOwner && (
                        <div className="service-sidebar">
                            <div className="service-edit-panel">
                                <button
                                    onClick={handleEditClick}
                                    className="service-edit-button"
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Редактировать услугу
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Основной контент */}
                    <div className="service-main-content">
                        {/* Заголовок услуги */}
                        <div className="service-header-card">
                            {/* Фото услуги */}
                            {service.photo && (() => {
                                const getImageUrl = () => {
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
                                };
                                const imageUrl = getImageUrl();
                                return imageUrl ? (
                                    <div className="service-detail-photo">
                                        <img
                                            src={imageUrl}
                                            alt={service.title}
                                            className="service-detail-photo-img"
                                        />
                                    </div>
                                ) : null;
                            })()}
                            <h1 className="service-title">{service.title}</h1>
                            <p className="service-description">{service.description}</p>
                            <div className="service-price">
                                {priceFormatter.format(service.price)}
                            </div>
                        </div>

                        {/* Автор услуги */}
                        <div className="service-author-card">
                            <h2 className="service-section-title">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Автор услуги
                            </h2>
                            <div className="service-author-info">
                                <div className="service-author-avatar">
                                    {service.user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="service-author-details">
                                    <h3>{service.user.name}</h3>
                                    <p className="service-author-role">
                                        {service.user.role === 'admin' ? 'Администратор' : 
                                         service.user.role === 'moderator' ? 'Модератор' : 'Мастер'}
                                    </p>
                                </div>
                            </div>
                            {service.user.about && (
                                <div className="service-author-about">
                                    {service.user.about}
                                </div>
                            )}
                        </div>

                        {/* Теги */}
                        {service.tags.length > 0 && (
                            <div className="service-tags-card">
                                <h2 className="service-section-title">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    Теги
                                </h2>
                                <div className="service-tags-list">
                                    {service.tags.map((tag) => (
                                        <span key={tag.id} className="service-tag">
                                            {tag.title}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Расписание с датами */}
                        <div className="service-schedule-card">
                            <h2 className="service-section-title">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Расписание
                            </h2>
                            
                            {service.dates.length === 0 ? (
                                <p className="service-schedule-empty">Нет доступных дат для записи</p>
                            ) : (
                                <div className="service-schedule-list">
                                    {service.dates.map((dateItem) => (
                                        <div key={dateItem.id} className="service-date-card">
                                            <h3 className="service-date-title">
                                                {formatDate(dateItem.date)}
                                            </h3>
                                            <div className="service-slots-grid">
                                                {Object.entries(dateItem.slots).map(([time, status]) => {
                                                    const isAvailable = status === 'available';
                                                    const isBooked = status === 'booked';
                                                    const canBook = !isOwner && isAvailable && user;
                                                    
                                                    return (
                                                        <button
                                                            key={time}
                                                            onClick={() => handleSlotClick(dateItem.id, time, status)}
                                                            disabled={!canBook}
                                                            className={cn(
                                                                'service-slot-button',
                                                                isAvailable && canBook && 'service-slot-available',
                                                                isAvailable && !canBook && 'service-slot-available',
                                                                isBooked && 'service-slot-booked',
                                                                !isAvailable && !isBooked && 'service-slot-unavailable'
                                                            )}
                                                        >
                                                            {time} {isAvailable ? (canBook ? '✓' : '') : isBooked ? '✗' : ''}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isOwner && (
                                <p className="service-owner-notice">
                                    Вы являетесь создателем этой услуги. Для записи на даты используйте панель управления.
                                </p>
                            )}
                        </div>

                        {/* Модальное окно подтверждения записи */}
                        {bookingSlot && !isOwner && (
                            <div className="service-booking-modal">
                                <div className="service-booking-modal-content">
                                    <h3 className="service-booking-modal-title">Подтверждение записи</h3>
                                    
                                    {bookingSuccess ? (
                                        <div className="service-booking-success">
                                            Вы успешно записались на услугу!
                                        </div>
                                    ) : (
                                        <>
                                            <div className="service-booking-info">
                                                <p className="service-booking-info-item">
                                                    <span className="service-booking-info-label">Время:</span> {bookingSlot.slotTime}
                                                </p>
                                                <p className="service-booking-info-item">
                                                    <span className="service-booking-info-label">Стоимость:</span> {priceFormatter.format(service.price)}
                                                </p>
                                            </div>

                                            {bookingError && (
                                                <div className="service-booking-error">
                                                    {bookingError}
                                                </div>
                                            )}

                                            <div className="service-booking-actions">
                                                <button
                                                    onClick={handleConfirmBooking}
                                                    disabled={isBooking}
                                                    className="service-booking-confirm"
                                                >
                                                    {isBooking ? 'Запись...' : 'Подтвердить'}
                                                </button>
                                                <button
                                                    onClick={handleCancelBooking}
                                                    disabled={isBooking}
                                                    className="service-booking-cancel"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Модальное окно редактирования услуги */}
                        {isEditing && isOwner && (
                            <div className="service-booking-modal">
                                <div className="service-booking-modal-content" style={{ maxWidth: '600px' }}>
                                    <h3 className="service-booking-modal-title">Редактирование услуги</h3>
                                    
                                    <div className="service-edit-form">
                                        <div className="service-edit-field">
                                            <label className="service-edit-label">
                                                Название услуги *
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.title}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                className="service-edit-input"
                                                placeholder="Введите название услуги"
                                            />
                                        </div>

                                        <div className="service-edit-field">
                                            <label className="service-edit-label">
                                                Описание *
                                            </label>
                                            <textarea
                                                value={editForm.description}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                                className="service-edit-textarea"
                                                placeholder="Введите описание услуги"
                                                rows={5}
                                            />
                                        </div>

                                        <div className="service-edit-field">
                                            <label className="service-edit-label">
                                                Цена (₽) *
                                            </label>
                                            <input
                                                type="number"
                                                value={editForm.price}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                                                className="service-edit-input"
                                                placeholder="Введите цену"
                                                min="0"
                                            />
                                        </div>

                                        <div className="service-edit-field">
                                            <label className="service-edit-label">
                                                Фото услуги (необязательно)
                                            </label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 4 * 1024 * 1024) {
                                                                setEditError('Размер файла не должен превышать 4 МБ');
                                                                return;
                                                            }
                                                            setEditPhotoFile(file);
                                                            setEditForm(prev => ({ ...prev, photo: '' }));
                                                        }
                                                    }}
                                                    style={{ marginBottom: '0.5rem' }}
                                                />
                                                {editPhotoFile && (
                                                    <div style={{ fontSize: '0.875rem', color: '#858585' }}>
                                                        Выбран файл: {editPhotoFile.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditPhotoFile(null)}
                                                            style={{ marginLeft: '0.5rem', color: '#f5576c', cursor: 'pointer' }}
                                                        >
                                                            Удалить
                                                        </button>
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.75rem', color: '#858585', marginTop: '0.25rem' }}>
                                                    Или введите URL:
                                                </div>
                                                <input
                                                    type="url"
                                                    value={editForm.photo}
                                                    onChange={(e) => {
                                                        setEditForm(prev => ({ ...prev, photo: e.target.value }));
                                                        if (e.target.value) {
                                                            setEditPhotoFile(null);
                                                        }
                                                    }}
                                                    className="service-edit-input"
                                                    placeholder="https://example.com/photo.jpg"
                                                    disabled={!!editPhotoFile}
                                                />
                                            </div>
                                        </div>

                                        {editError && (
                                            <div className="service-booking-error">
                                                {editError}
                                            </div>
                                        )}

                                        <div className="service-booking-actions">
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={isSaving}
                                                className="service-booking-confirm"
                                            >
                                                {isSaving ? 'Сохранение...' : 'Сохранить'}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                                className="service-booking-cancel"
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
