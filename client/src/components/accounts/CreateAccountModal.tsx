import React, { useState, useEffect } from 'react';
import { accountsApi } from '../../api/accounts/accounts.api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type {
    PayoutMethod,
    CreateAccountModel,
    UpdateAccountModel,
    AccountResponse
} from '../../api/accounts/types';
import './CreateAccountModal.css';

interface CreateAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode?: 'create' | 'edit';
    account?: AccountResponse | null;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    mode = 'create',
    account = null
}) => {
    const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('yoo_money');
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
            if (mode === 'edit' && account) {
                setPayoutMethod('yoo_money');
                setFullName(account.full_name || '');
                setYoomoneyWallet(account.yoomoney_wallet || '');
            } else {
                // Сброс формы при открытии на создание
                setPayoutMethod('yoo_money');
                setFullName('');
                setYoomoneyWallet('');
            }
            setCardNumber('');
            setBankAccount('');
            setPhone('');
            setInn('');
            setError(null);
        }
    }, [isOpen, mode, account]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Валидация
        if (!fullName.trim()) {
            setError('ФИО обязательно для заполнения');
            return;
        }

        const baseData = {
            payout_method: 'yoo_money' as PayoutMethod,
            full_name: fullName.trim(),
        };

        let payload: CreateAccountModel | UpdateAccountModel = { ...baseData };

        if (!yoomoneyWallet.trim()) {
            setError('Номер кошелька ЮMoney обязателен');
            return;
        }
        payload.yoomoney_wallet = yoomoneyWallet.trim();

        setIsLoading(true);

        try {
            if (mode === 'edit') {
                await accountsApi.update(payload as UpdateAccountModel);
            } else {
                await accountsApi.create(payload as CreateAccountModel);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(
                err?.response?.data?.detail ||
                (mode === 'edit'
                    ? 'Не удалось обновить счет. Попробуйте позже.'
                    : 'Не удалось создать счет. Попробуйте позже.')
            );
            console.error('Error saving account:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const payoutMethods: Array<{ value: PayoutMethod; label: string; icon: string }> = [
        { value: 'yoo_money', label: 'ЮMoney кошелек', icon: '💰' },
    ];

    return (
        <div className="account-modal-overlay" onClick={onClose}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="account-modal-header">
                    <h3 className="account-modal-title">
                        {mode === 'edit' ? 'Редактирование счета' : 'Создание счета для выплат'}
                    </h3>
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
                            Способ выплаты (только ЮMoney) <span className="required">*</span>
                        </label>
                        <select
                            className="account-form-select"
                            value={payoutMethod}
                            disabled
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
                                    <span>{mode === 'edit' ? 'Сохранение...' : 'Создание...'}</span>
                                </>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>{mode === 'edit' ? 'Сохранить' : 'Создать счет'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

