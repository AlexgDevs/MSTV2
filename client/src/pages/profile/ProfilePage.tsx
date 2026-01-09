import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { paymentsApi } from '../../api/payments/payments.api';
import type { PaymentResponse } from '../../api/payments/types';
import { chatsApi } from '../../api/chats/chats.api';
import { ChatList } from '../../components/chats/ChatList';
import type { UnifiedChatItem } from '../chats/ChatsPage';
import { enrollsApi } from '../../api/enrolls/enrolls.api';
import { disputesApi } from '../../api/disputes/disputes.api';
import type { DisputeResponse } from '../../api/disputes/types';
import { ComplainModal } from '../../components/enrolls/ComplainModal';
import { BookingMenu } from '../../components/enrolls/BookingMenu';
import '../../assets/styles/ProfilePage.css'

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
});

const statusVariants: Record<string, { class: string; label: string }> = {
    pending: { class: 'status-pending', label: 'Ожидание' },
    confirmed: { class: 'status-confirmed', label: 'Подтверждено' },
    ready: { class: 'status-ready', label: 'Готово к подтверждению' },
    completed: { class: 'status-completed', label: 'Завершено' },
    cancelled: { class: 'status-cancelled', label: 'Отменено' },
    expired: { class: 'status-expired', label: 'Истекло' }
};

const paymentStatusVariants: Record<string, { class: string; label: string }> = {
    pending: { class: 'status-pending', label: 'Ожидание оплаты' },
    processing: { class: 'status-processing', label: 'Обработка' },
    succeeded: { class: 'status-confirmed', label: 'Оплачено' },
    canceled: { class: 'status-cancelled', label: 'Отменено' },
    failed: { class: 'status-cancelled', label: 'Ошибка' }
};

type TabId = 'profile' | 'payments' | 'chats';

export const ProfilePage: React.FC = () => {
    const { user, updateProfile, refreshUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        about: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    
    // Payments state
    const [payments, setPayments] = useState<PaymentResponse[]>([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);
    const [paymentsError, setPaymentsError] = useState<string | null>(null);

    // Chats state
    const [chats, setChats] = useState<UnifiedChatItem[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [chatsError, setChatsError] = useState<string | null>(null);

    // Complain modal state
    const [selectedEnrollForComplain, setSelectedEnrollForComplain] = useState<{
        enrollId: number;
        masterId: number;
    } | null>(null);
    const [isComplainModalOpen, setIsComplainModalOpen] = useState(false);

    // Disputes state
    const [userDisputes, setUserDisputes] = useState<DisputeResponse[]>([]);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                about: user.about || ''
            });
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'payments') {
            loadPayments();
        } else if (activeTab === 'chats') {
            loadChats();
        } else if (activeTab === 'profile') {
            loadUserDisputes();
        }
    }, [activeTab, user]);

    const loadPayments = async () => {
        setIsLoadingPayments(true);
        setPaymentsError(null);
        try {
            const response = await paymentsApi.getAll(100, 0);
            setPayments(response.data);
        } catch (error) {
            setPaymentsError(error instanceof Error ? error.message : 'Не удалось загрузить историю покупок');
        } finally {
            setIsLoadingPayments(false);
        }
    };

    const loadChats = async () => {
        if (!user) return;
        setIsLoadingChats(true);
        setChatsError(null);
        try {
            const response = await chatsApi.getServiceChats();
            // Проверяем, что response.data существует и является массивом
            if (response && response.data && Array.isArray(response.data)) {
                // Фильтруем только чаты где пользователь клиент
                const clientChats = response.data
                    .filter(chat => chat && chat.client_id === user.id)
                    .map(chat => ({ ...chat, type: 'service' as const }));
                setChats(clientChats);
            } else {
                setChats([]);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
            setChatsError(error instanceof Error ? error.message : 'Не удалось загрузить чаты');
            setChats([]);
        } finally {
            setIsLoadingChats(false);
        }
    };

    const loadUserDisputes = async () => {
        if (!user) return;
        try {
            const response = await disputesApi.getByClient();
            setUserDisputes(response.data);
        } catch (error) {
            console.error('Error loading disputes:', error);
            setUserDisputes([]);
        }
    };

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

    const bookings = user?.services_enroll ?? [];

    // formatSlotTime больше не нужен, так как slot_time - это просто время (например "14:00")

    if (!user) {
        return null;
    }

    const formatPaymentDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const renderProfileTab = () => (
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
                                        const status = statusVariants[enroll.status] || statusVariants.pending;
                                        const serviceTitle = enroll.service?.title || `Услуга #${enroll.service_id}`;
                                        const serviceDescription = enroll.service?.description || '';
                                        const serviceAuthor = enroll.service?.user?.name || 'Неизвестный автор';
                                        
                                        // Форматируем дату для отображения
                                        const formatDate = (dateString: string | null | undefined): string => {
                                            if (!dateString) return '';
                                            try {
                                                // Парсим формат dd-mm-YYYY
                                                const [day, month, year] = dateString.split('-');
                                                if (day && month && year) {
                                                    return `${day}.${month}.${year}`;
                                                }
                                                return dateString;
                                            } catch {
                                                return dateString;
                                            }
                                        };
                                        
                                        const formattedDate = formatDate(enroll.date);
                                        const dateTimeDisplay = formattedDate 
                                            ? `${formattedDate}, ${enroll.slot_time}` 
                                            : enroll.slot_time;

                                        const masterId = enroll.service?.user?.id;
                                        // Проверяем, есть ли уже спор для этого enroll
                                        const hasExistingDispute = userDisputes.some(
                                            dispute => dispute.enroll_id === enroll.id
                                        );
                                        const canComplain = (enroll.status === 'ready' || enroll.status === 'completed') && masterId && !hasExistingDispute;
                                        
                                        // Получаем существующий спор, если есть
                                        const existingDispute = userDisputes.find(
                                            dispute => dispute.enroll_id === enroll.id
                                        );

                                        return (
                                            <div key={enroll.id} className="booking-item">
                                                {canComplain && (
                                                    <div className="booking-menu-wrapper">
                                                        <BookingMenu
                                                            onComplain={() => {
                                                                setSelectedEnrollForComplain({
                                                                    enrollId: enroll.id,
                                                                    masterId: masterId!
                                                                });
                                                                setIsComplainModalOpen(true);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                {hasExistingDispute && existingDispute && (
                                                    <div className="booking-dispute-badge">
                                                        <span className={`dispute-status-badge dispute-status-${existingDispute.disput_status}`}>
                                                            {existingDispute.disput_status === 'wait_for_arbitr' && 'Жалоба подана'}
                                                            {existingDispute.disput_status === 'in_process' && 'Жалоба рассматривается'}
                                                            {existingDispute.disput_status === 'closed' && 'Жалоба закрыта'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="booking-info">
                                                    <p className="booking-time">{dateTimeDisplay}</p>
                                                    <h3 className="booking-title">{serviceTitle}</h3>
                                                    {serviceDescription && (
                                                        <p className="booking-description">
                                                            {serviceDescription.length > 100 
                                                                ? `${serviceDescription.substring(0, 100)}...` 
                                                                : serviceDescription}
                                                        </p>
                                                    )}
                                                    <p className="booking-meta">
                                                        Мастер: <strong>{serviceAuthor}</strong>
                                                    </p>
                                                </div>
                                                <div className="booking-details">
                                                    <span className={`status-badge ${status.class}`}>
                                                        {status.label}
                                                    </span>
                                                    <p className="booking-price">
                                                        {priceFormatter.format(enroll.price)}
                                                    </p>
                                                    {enroll.status === 'ready' && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await enrollsApi.confirm(enroll.id);
                                                                    // Обновляем данные пользователя для обновления списка записей
                                                                    await refreshUser();
                                                                } catch (error: any) {
                                                                    alert(error?.response?.data?.detail || 'Не удалось подтвердить заказ');
                                                                }
                                                            }}
                                                            className="btn btn-primary"
                                                            style={{ marginTop: '8px', width: '100%' }}
                                                        >
                                                            Подтвердить заказ
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
    );

    const renderChatsTab = () => (
        <div className="profile-chats">
            <div className="profile-card">
                <div className="profile-card-header">
                    <h2 className="profile-card-title">Мои чаты</h2>
                    <p className="profile-card-subtitle">
                        {chats.length ? `Всего чатов: ${chats.length}` : 'Чатов пока нет'}
                    </p>
                </div>
                <div className="profile-card-content">
                    <ChatList
                        chats={chats}
                        isLoading={isLoadingChats}
                        error={chatsError}
                        currentUserId={user?.id || 0}
                        showMasterInfo={false}
                    />
                </div>
            </div>
        </div>
    );

    const renderPaymentsTab = () => (
        <div className="profile-payments">
            <div className="profile-card">
                <div className="profile-card-header">
                    <h2 className="profile-card-title">История покупок</h2>
                    <p className="profile-card-subtitle">
                        {payments.length ? `Всего платежей: ${payments.length}` : 'Платежей пока нет'}
                    </p>
                </div>
                <div className="profile-card-content">
                    {isLoadingPayments ? (
                        <p className="booking-empty">Загрузка...</p>
                    ) : paymentsError ? (
                        <div className={`feedback feedback-error`}>
                            {paymentsError}
                        </div>
                    ) : payments.length === 0 ? (
                        <p className="booking-empty">
                            У вас пока нет платежей. После оплаты услуги они появятся здесь.
                        </p>
                    ) : (
                        <div className="payments-list">
                            {payments.map(payment => {
                                const status = paymentStatusVariants[payment.status] || paymentStatusVariants.pending;
                                const serviceTitle = payment.service?.title || 'Услуга';
                                const masterName = payment.service?.master_name || 'Неизвестный мастер';
                                
                                // Форматируем дату записи
                                const formatEnrollDate = (dateString: string | null | undefined): string => {
                                    if (!dateString) return '';
                                    try {
                                        const [day, month, year] = dateString.split('-');
                                        if (day && month && year) {
                                            return `${day}.${month}.${year}`;
                                        }
                                        return dateString;
                                    } catch {
                                        return dateString;
                                    }
                                };
                                
                                const enrollDateTime = payment.enroll_date && payment.enroll_time
                                    ? `${formatEnrollDate(payment.enroll_date)}, ${payment.enroll_time}`
                                    : payment.enroll_time || null;

                                return (
                                    <div key={payment.id} className="payment-item">
                                        <div className="payment-info">
                                            <p className="payment-time">
                                                {formatPaymentDate(payment.created_at)}
                                            </p>
                                            <h3 className="payment-title">
                                                {serviceTitle}
                                            </h3>
                                            {payment.service?.description && (
                                                <p className="payment-description">
                                                    {payment.service.description.length > 100 
                                                        ? `${payment.service.description.substring(0, 100)}...` 
                                                        : payment.service.description}
                                                </p>
                                            )}
                                            <p className="payment-meta">
                                                Мастер: <strong>{masterName}</strong>
                                            </p>
                                            {enrollDateTime && (
                                                <p className="payment-meta">
                                                    Запись: {enrollDateTime}
                                                </p>
                                            )}
                                            {payment.paid_at && (
                                                <p className="payment-meta">
                                                    Оплачено: {formatPaymentDate(payment.paid_at)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="payment-details">
                                            <span className={`status-badge ${status.class}`}>
                                                {status.label}
                                            </span>
                                            <p className="payment-price">
                                                {priceFormatter.format(payment.amount)}
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
    );

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

                {/* Tabs */}
                <div className="profile-tabs">
                    <button
                        className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Профиль
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'payments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payments')}
                    >
                        История покупок
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'chats' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chats')}
                    >
                        Чаты
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'payments' && renderPaymentsTab()}
                {activeTab === 'chats' && renderChatsTab()}
            </div>

            {/* Complain Modal */}
            {selectedEnrollForComplain && (
                <ComplainModal
                    isOpen={isComplainModalOpen}
                    onClose={() => {
                        setIsComplainModalOpen(false);
                        setSelectedEnrollForComplain(null);
                    }}
                    enrollId={selectedEnrollForComplain.enrollId}
                    masterId={selectedEnrollForComplain.masterId}
                    onSuccess={() => {
                        refreshUser();
                        loadUserDisputes();
                    }}
                />
            )}
        </div>
    );
};