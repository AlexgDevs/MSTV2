import React, { useState } from 'react';
import { paymentsApi } from '../../api/payments/payments.api';
import { useAuthStore } from '../../stores/auth.store';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import './PaymentModal.css';

interface PaymentModalProps {
    isOpen: boolean;
    enrollId: number;
    amount: number;
    serviceName: string;
    onClose: () => void;
    onSuccess: (confirmationUrl: string) => void;
}

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
});

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    enrollId,
    amount,
    serviceName,
    onClose,
    onSuccess
}) => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCreatePayment = async () => {
        // Проверка подтверждения почты
        if (!user?.verified_email) {
            setError('Для оплаты услуги необходимо подтвердить email. Пожалуйста, проверьте почту и подтвердите email в настройках профиля.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const returnUrl = `${window.location.origin}/payment/success`;
            const response = await paymentsApi.create({
                enroll_id: enrollId,
                return_url: returnUrl
            });

            if (response.data.confirmation_url) {
                onSuccess(response.data.confirmation_url);
            } else {
                setError('Не удалось получить ссылку для оплаты');
            }
        } catch (err: any) {
            setError(
                err?.response?.data?.detail || 
                'Не удалось создать платеж. Попробуйте позже.'
            );
            console.error('Error creating payment:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="payment-modal-header">
                    <h3 className="payment-modal-title">Оплата услуги</h3>
                    <button
                        className="payment-modal-close"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="payment-modal-body">
                    <div className="payment-info">
                        <div className="payment-info-item">
                            <span className="payment-info-label">Услуга:</span>
                            <span className="payment-info-value">{serviceName}</span>
                        </div>
                        <div className="payment-info-item">
                            <span className="payment-info-label">Сумма к оплате:</span>
                            <span className="payment-info-value payment-amount">
                                {priceFormatter.format(amount)}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="payment-error">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="payment-note">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>После нажатия кнопки "Оплатить" вы будете перенаправлены на страницу оплаты ЮKassa</span>
                    </div>
                </div>

                <div className="payment-modal-footer">
                    <button
                        className="payment-btn payment-btn-cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Отмена
                    </button>
                    <button
                        className="payment-btn payment-btn-primary"
                        onClick={handleCreatePayment}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <LoadingSpinner size="sm" />
                                <span>Создание платежа...</span>
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                                </svg>
                                <span>Оплатить</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

