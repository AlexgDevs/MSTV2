import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckIcon } from '../../components/icons/Icons';
import './PaymentSuccessPage.css';

export const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const paymentId = searchParams.get('payment_id');

    useEffect(() => {
        // Автоматически перенаправляем на главную через 5 секунд
        const timer = setTimeout(() => {
            navigate('/');
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="payment-success-page">
            <div className="payment-success-container">
                <div className="payment-success-card">
                    <div className="payment-success-icon">
                        <CheckIcon />
                    </div>
                    <h1 className="payment-success-title">Оплата успешно завершена!</h1>
                    <p className="payment-success-message">
                        Ваш платеж был успешно обработан. Бронирование подтверждено.
                    </p>
                    {paymentId && (
                        <div className="payment-success-info">
                            <span className="payment-success-label">ID платежа:</span>
                            <span className="payment-success-value">{paymentId}</span>
                        </div>
                    )}
                    <div className="payment-success-actions">
                        <button
                            className="payment-success-btn"
                            onClick={() => navigate('/')}
                        >
                            Вернуться на главную
                        </button>
                        <button
                            className="payment-success-btn payment-success-btn-secondary"
                            onClick={() => navigate('/profile')}
                        >
                            Мои бронирования
                        </button>
                    </div>
                    <p className="payment-success-note">
                        Вы будете автоматически перенаправлены на главную страницу через несколько секунд...
                    </p>
                </div>
            </div>
        </div>
    );
};

