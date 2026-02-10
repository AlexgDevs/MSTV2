import React, { useState } from 'react';
import { paymentsApi } from '../../api/payments/payments.api';
import { useAuthStore } from '../../stores/auth.store';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import './PaymentModal.css';

interface ContinuePaymentModalProps {
    isOpen: boolean;
    enrollId: number;
    amount: number;
    serviceName: string;
    slotTime: string;
    dateString?: string;
    onClose: () => void;
    onSuccess: (confirmationUrl: string) => void;
}

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
});

export const ContinuePaymentModal: React.FC<ContinuePaymentModalProps> = ({
    isOpen,
    enrollId,
    amount,
    serviceName,
    slotTime,
    dateString,
    onClose,
    onSuccess
}) => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleContinuePayment = async () => {
        // Проверка подтверждения почты
        if (!user?.verified_email) {
            setError('Для оплаты необходимо подтвердить email.');
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

            const { confirmation_url, payment_id } = response.data;

            if (confirmation_url) {
                // Боевой / тестовый сценарий с редиректом на страницу оплаты ЮKassa
                onSuccess(confirmation_url);
            } else if (payment_id) {
                // ДЕМО-СЦЕНАРИЙ: ссылки нет, но есть локальный payment_id
                window.location.href = `/payment/success?payment_id=${payment_id}`;
            } else {
                setError('Не удалось инициализировать платеж');
            }
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Серверная ошибка платежа');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="payment-modal-overlay">
            <div className="payment-modal-container">
                <h3>Подтверждение оплаты</h3>
                <div className="payment-details">
                    <p><strong>Услуга:</strong> {serviceName}</p>
                    <p><strong>Дата:</strong> {dateString} в {slotTime}</p>
                    <p><strong>К оплате:</strong> {priceFormatter.format(amount)}</p>
                </div>

                {error && <div className="payment-error">{error}</div>}

                <div className="payment-modal-actions">
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="btn-secondary"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={handleContinuePayment} 
                        disabled={isLoading}
                        className="btn-primary"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Оплатить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

//     const handleContinuePayment = async () => {
//         // Проверка подтверждения почты
//         if (!user?.verified_email) {
//             setError('Для оплаты услуги необходимо подтвердить email. Пожалуйста, проверьте почту и подтвердите email в настройках профиля.');
//             return;
//         }

//         setIsLoading(true);
//         setError(null);

//         try {
//             const returnUrl = `${window.location.origin}/payment/success`;
//             const response = await paymentsApi.create({
//                 enroll_id: enrollId,
//                 return_url: returnUrl
//             });

//             if (response.data.confirmation_url) {
//                 onSuccess(response.data.confirmation_url);
//             } else {
//                 setError('Не удалось получить ссылку для оплаты');
//             }
//         } catch (err: any) {
//             setError(
//                 err?.response?.data?.detail || 
//                 'Не удалось создать платеж. Попробуйте позже.'
//             );
//             console.error('Error creating payment:', err);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const formatDate = (dateString?: string): string => {
//         if (!dateString) return '';
//         try {
//             const [day, month, year] = dateString.split('-');
//             if (day && month && year) {
//                 return `${day}.${month}.${year}`;
//             }
//             return dateString;
//         } catch {
//             return dateString;
//         }
//     };

//     const formattedDate = formatDate(dateString);
//     const dateTimeDisplay = formattedDate 
//         ? `${formattedDate}, ${slotTime}` 
//         : slotTime;

//     return (
//         <div className="payment-modal-overlay" onClick={onClose}>
//             <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
//                 <div className="payment-modal-header">
//                     <h3 className="payment-modal-title">Продолжить оплату</h3>
//                     <button
//                         className="payment-modal-close"
//                         onClick={onClose}
//                         disabled={isLoading}
//                     >
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                             <path d="M18 6L6 18M6 6l12 12" />
//                         </svg>
//                     </button>
//                 </div>

//                 <div className="payment-modal-body">
//                     <div className="payment-info">
//                         <div className="payment-info-item">
//                             <span className="payment-info-label">Услуга:</span>
//                             <span className="payment-info-value">{serviceName}</span>
//                         </div>
//                         <div className="payment-info-item">
//                             <span className="payment-info-label">Дата и время:</span>
//                             <span className="payment-info-value">{dateTimeDisplay}</span>
//                         </div>
//                         <div className="payment-info-item">
//                             <span className="payment-info-label">Сумма к оплате:</span>
//                             <span className="payment-info-value payment-amount">
//                                 {priceFormatter.format(amount)}
//                             </span>
//                         </div>
//                     </div>

//                     <div className="payment-warning">
//                         <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
//                         </svg>
//                         <span>У вас есть незавершенная запись на этот слот. Завершите оплату, чтобы сохранить бронирование.</span>
//                     </div>

//                     {error && (
//                         <div className="payment-error">
//                             <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
//                                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                             </svg>
//                             {error}
//                         </div>
//                     )}

//                     <div className="payment-note">
//                         <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                         </svg>
//                         <span>После нажатия кнопки "Продолжить оплату" вы будете перенаправлены на страницу оплаты ЮKassa</span>
//                     </div>
//                 </div>

//                 <div className="payment-modal-footer">
//                     <button
//                         className="payment-btn payment-btn-cancel"
//                         onClick={onClose}
//                         disabled={isLoading}
//                     >
//                         Отмена
//                     </button>
//                     <button
//                         className="payment-btn payment-btn-primary"
//                         onClick={handleContinuePayment}
//                         disabled={isLoading}
//                     >
//                         {isLoading ? (
//                             <>
//                                 <LoadingSpinner size="sm" />
//                                 <span>Создание платежа...</span>
//                             </>
//                         ) : (
//                             <>
//                                 <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
//                                     <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
//                                     <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
//                                 </svg>
//                                 <span>Продолжить оплату</span>
//                             </>
//                         )}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

