import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import '../../assets/styles/ProfilePage.css'

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
});

const statusVariants: Record<string, { class: string; label: string }> = {
    pending: { class: 'status-pending', label: 'Ожидание' },
    confirmed: { class: 'status-confirmed', label: 'Подтверждено' },
    completed: { class: 'status-completed', label: 'Завершено' },
    cancelled: { class: 'status-cancelled', label: 'Отменено' },
    expired: { class: 'status-expired', label: 'Истекло' }
};

export const ProfilePage: React.FC = () => {
    const { user, updateProfile } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        about: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                about: user.about || ''
            });
        }
    }, [user]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [event.target.name]: event.target.value
        }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!formData.name.trim() || !formData.email.trim()) {
            setFeedback({ type: 'error', message: 'Имя и email обязательны' });
            return;
        }

        setIsSaving(true);
        setFeedback(null);

        try {
            await updateProfile({
                name: formData.name.trim(),
                email: formData.email.trim(),
                about: formData.about.trim() || null
            });
            setFeedback({ type: 'success', message: 'Профиль обновлён' });
            setIsEditing(false);
            // Очищаем сообщение через 3 секунды
            setTimeout(() => setFeedback(null), 3000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Не удалось сохранить изменения';
            setFeedback({ type: 'error', message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                about: user.about || ''
            });
        }
        setIsEditing(false);
        setFeedback(null);
    };

    const serviceTitleMap = useMemo(() => {
        const map = new Map<number, string>();
        user?.services?.forEach(service => {
            map.set(service.id, service.title);
        });
        return map;
    }, [user?.services]);

    const bookings = user?.services_enroll ?? [];

    const formatSlotTime = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!user) {
        return null;
    }

    return (
        <div className="profile-page">
            <div className="container">
                {/* Header */}
                <section className="profile-header">
                    <div className="flex items-center gap-6">
                        <div className="profile-avatar">
                            {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="profile-info">
                            <p className="profile-label">Аккаунт</p>
                            <h1 className="profile-name">{user.name}</h1>
                            <p className="profile-email">{user.email}</p>
                        </div>
                        <div className="profile-stats">
                            <div className="profile-stat">
                                <p className="profile-stat-label">Мои записи</p>
                                <p className="profile-stat-value">{bookings.length}</p>
                            </div>
                            <div className="profile-stat">
                                <p className="profile-stat-label">Созданные услуги</p>
                                <p className="profile-stat-value">{user.services?.length ?? 0}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Content */}
                <div className="profile-layout">
                    {/* Basic Info */}
                    <div className="profile-card">
                        <div className="profile-card-header">
                            <div className="profile-card-header-content">
                                <div>
                                    <h2 className="profile-card-title">Основная информация</h2>
                                    <p className="profile-card-subtitle">Эти данные видят клиенты и мастера</p>
                                </div>
                                {!isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="profile-btn-edit"
                                    >
                                        Редактировать
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="profile-card-content">
                            {isEditing ? (
                                <form className="profile-form" onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Имя</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">О себе</label>
                                        <textarea
                                            name="about"
                                            value={formData.about}
                                            onChange={handleChange}
                                            className="form-textarea"
                                            placeholder="Расскажите коротко о себе, специализации и опыте"
                                        />
                                    </div>

                                    {feedback && (
                                        <div className={`feedback feedback-${feedback.type}`}>
                                            {feedback.message}
                                        </div>
                                    )}

                                    <div className="profile-form-actions">
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="profile-btn-cancel"
                                            disabled={isSaving}
                                        >
                                            Отменить
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="profile-btn" 
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Сохраняем...' : 'Сохранить изменения'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="profile-view">
                                    <div className="profile-view-item">
                                        <label className="profile-view-label">Имя</label>
                                        <p className="profile-view-value">{user.name || '—'}</p>
                                    </div>

                                    <div className="profile-view-item">
                                        <label className="profile-view-label">Email</label>
                                        <p className="profile-view-value">{user.email || '—'}</p>
                                    </div>

                                    <div className="profile-view-item">
                                        <label className="profile-view-label">О себе</label>
                                        <p className="profile-view-value">
                                            {user.about || 'Информация не указана'}
                                        </p>
                                    </div>

                                    {feedback && (
                                        <div className={`feedback feedback-${feedback.type}`}>
                                            {feedback.message}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bookings */}
                    <div className="profile-card">
                        <div className="profile-card-header">
                            <h2 className="profile-card-title">Мои записи</h2>
                            <p className="profile-card-subtitle">
                                {bookings.length ? 'Последние заявки на услуги' : 'Записей пока нет'}
                            </p>
                        </div>
                        <div className="profile-card-content">
                            {bookings.length === 0 ? (
                                <p className="booking-empty">
                                    Вы ещё не записывались на услуги. Найдите мастера на главной странице и оформите первую запись.
                                </p>
                            ) : (
                                <div className="bookings-list">
                                    {bookings.map(enroll => {
                                        const title =
                                            serviceTitleMap.get(enroll.service_id) ||
                                            `Услуга #${enroll.service_id}`;
                                        const status = statusVariants[enroll.status] || statusVariants.pending;

                                        return (
                                            <div key={enroll.id} className="booking-item">
                                                <div className="booking-info">
                                                    <p className="booking-time">{formatSlotTime(enroll.slot_time)}</p>
                                                    <h3 className="booking-title">{title}</h3>
                                                    <p className="booking-meta">Дата записи #{enroll.service_date_id}</p>
                                                </div>
                                                <div className="booking-details">
                                                    <span className={`status-badge ${status.class}`}>
                                                        {status.label}
                                                    </span>
                                                    <p className="booking-price">
                                                        {priceFormatter.format(enroll.price)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};