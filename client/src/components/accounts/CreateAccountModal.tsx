import React, { useState, useEffect } from 'react';
import { accountsApi } from '../../api/accounts/accounts.api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { PayoutMethod, CreateAccountModel } from '../../api/accounts/types';
import './CreateAccountModal.css';

interface CreateAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('bank_card');
    const [fullName, setFullName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [yoomoneyWallet, setYoomoneyWallet] = useState('');
    const [phone, setPhone] = useState('');
    const [inn, setInn] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Сброс формы при открытии
            setPayoutMethod('bank_card');
            setFullName('');
            setCardNumber('');
            setBankAccount('');
            setYoomoneyWallet('');
            setPhone('');
            setInn('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Валидация
        if (!fullName.trim()) {
            setError('ФИО обязательно для заполнения');
            return;
        }

        const accountData: CreateAccountModel = {
            payout_method: payoutMethod,
            full_name: fullName.trim(),
        };

        // Добавляем поля в зависимости от метода выплаты
        if (payoutMethod === 'bank_card') {
            if (!cardNumber.trim()) {
                setError('Номер карты обязателен для банковской карты');
                return;
            }
            accountData.card_number = cardNumber.trim();
        } else if (payoutMethod === 'yoo_money') {
            if (!yoomoneyWallet.trim()) {
                setError('Номер кошелька ЮMoney обязателен');
                return;
            }
            accountData.yoomoney_wallet = yoomoneyWallet.trim();
        } else if (payoutMethod === 'sbp') {
            if (!phone.trim()) {
                setError('Номер телефона обязателен для СБП');
                return;
            }
            accountData.phone = phone.trim();
        } else if (payoutMethod === 'bank_account') {
            if (!bankAccount.trim()) {
                setError('Банковский счет обязателен');
                return;
            }
            accountData.bank_account = bankAccount.trim();
        } else if (payoutMethod === 'self_employed') {
            if (!inn.trim()) {
                setError('ИНН обязателен для самозанятого');
                return;
            }
            accountData.inn = inn.trim();
        }

        setIsLoading(true);

        try {
            await accountsApi.create(accountData);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(
                err?.response?.data?.detail ||
                'Не удалось создать счет. Попробуйте позже.'
            );
            console.error('Error creating account:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const payoutMethods: Array<{ value: PayoutMethod; label: string; icon: string }> = [
        { value: 'bank_card', label: 'Банковская карта', icon: '💳' },
        { value: 'yoo_money', label: 'ЮMoney кошелек', icon: '💰' },
        { value: 'sbp', label: 'СБП (Система быстрых платежей)', icon: '📱' },
        { value: 'bank_account', label: 'Банковский счет', icon: '🏦' },
        { value: 'self_employed', label: 'Самозанятый', icon: '📄' },
    ];

    return (
        <div className="account-modal-overlay" onClick={onClose}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="account-modal-header">
                    <h3 className="account-modal-title">Создание счета для выплат</h3>
                    <button
                        className="account-modal-close"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="account-modal-body">
                    <div className="account-form-group">
                        <label className="account-form-label">
                            Способ выплаты <span className="required">*</span>
                        </label>
                        <select
                            className="account-form-select"
                            value={payoutMethod}
                            onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
                            disabled={isLoading}
                            required
                        >
                            {payoutMethods.map((method) => (
                                <option key={method.value} value={method.value}>
                                    {method.icon} {method.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="account-form-group">
                        <label className="account-form-label">
                            ФИО <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            className="account-form-input"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Иванов Иван Иванович"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {payoutMethod === 'bank_card' && (
                        <div className="account-form-group">
                            <label className="account-form-label">
                                Номер карты <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className="account-form-input"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="1234 5678 9012 3456"
                                maxLength={19}
                                disabled={isLoading}
                                required
                            />
                        </div>
                    )}

                    {payoutMethod === 'yoo_money' && (
                        <div className="account-form-group">
                            <label className="account-form-label">
                                Номер кошелька ЮMoney <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className="account-form-input"
                                value={yoomoneyWallet}
                                onChange={(e) => setYoomoneyWallet(e.target.value)}
                                placeholder="410011234567890"
                                disabled={isLoading}
                                required
                            />
                        </div>
                    )}

                    {payoutMethod === 'sbp' && (
                        <div className="account-form-group">
                            <label className="account-form-label">
                                Номер телефона <span className="required">*</span>
                            </label>
                            <input
                                type="tel"
                                className="account-form-input"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                placeholder="+7 (999) 123-45-67"
                                disabled={isLoading}
                                required
                            />
                        </div>
                    )}

                    {payoutMethod === 'bank_account' && (
                        <div className="account-form-group">
                            <label className="account-form-label">
                                Банковский счет <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className="account-form-input"
                                value={bankAccount}
                                onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
                                placeholder="40817810099910004312"
                                disabled={isLoading}
                                required
                            />
                        </div>
                    )}

                    {payoutMethod === 'self_employed' && (
                        <div className="account-form-group">
                            <label className="account-form-label">
                                ИНН <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className="account-form-input"
                                value={inn}
                                onChange={(e) => setInn(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456789012"
                                maxLength={12}
                                disabled={isLoading}
                                required
                            />
                        </div>
                    )}

                    {error && (
                        <div className="account-error">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="account-note">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>После создания счет будет отправлен на проверку. После подтверждения вы сможете получать выплаты.</span>
                    </div>

                    <div className="account-modal-footer">
                        <button
                            type="button"
                            className="account-btn account-btn-cancel"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="account-btn account-btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="sm" />
                                    <span>Создание...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>Создать счет</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

