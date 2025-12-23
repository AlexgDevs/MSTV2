import React, { useState } from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';
import './CancelReasonModal.css';

interface CancelReasonModalProps {
    isOpen: boolean;
    clientName: string;
    serviceTitle: string;
    enrollPrice: number;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

const PREDEFINED_REASONS = [
    'Недоступен в указанное время',
    'Изменение расписания',
    'Технические проблемы',
    'Личные обстоятельства',
    'Клиент не подтвердил запись',
    'Другая причина'
];

export const CancelReasonModal: React.FC<CancelReasonModalProps> = ({
    isOpen,
    clientName,
    serviceTitle,
    enrollPrice,
    onConfirm,
    onCancel
}) => {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const priceFormatter = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
    });

    const handleReasonSelect = (reason: string) => {
        setSelectedReason(reason);
        if (reason === 'Другая причина') {
            setShowCustomInput(true);
        } else {
            setShowCustomInput(false);
            setCustomReason('');
        }
    };

    const handleNext = () => {
        if (!selectedReason) {
            alert('Пожалуйста, выберите причину отмены');
            return;
        }
        if (selectedReason === 'Другая причина' && !customReason.trim()) {
            alert('Пожалуйста, укажите причину отмены');
            return;
        }
        setShowConfirmModal(true);
    };

    const handleFinalConfirm = () => {
        const reason = selectedReason === 'Другая причина' ? customReason.trim() : selectedReason;
        onConfirm(reason);
        // Сброс состояния
        setSelectedReason('');
        setCustomReason('');
        setShowCustomInput(false);
        setShowConfirmModal(false);
    };

    const handleCancel = () => {
        setSelectedReason('');
        setCustomReason('');
        setShowCustomInput(false);
        setShowConfirmModal(false);
        onCancel();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="cancel-reason-modal-overlay" onClick={handleCancel}>
                <div className="cancel-reason-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="cancel-reason-modal-header">
                        <h2 className="cancel-reason-modal-title">Причина отмены</h2>
                        <button 
                            className="cancel-reason-modal-close"
                            onClick={handleCancel}
                            aria-label="Закрыть"
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className="cancel-reason-modal-content">
                        <div className="cancel-reason-info">
                            <p className="cancel-reason-info-text">
                                Вы отменяете запись клиента <strong>{clientName}</strong>
                            </p>
                            <p className="cancel-reason-info-text">
                                Услуга: <strong>{serviceTitle}</strong>
                            </p>
                            <p className="cancel-reason-info-text">
                                Сумма: <strong>{priceFormatter.format(enrollPrice)}</strong>
                            </p>
                        </div>

                        <div className="cancel-reason-selection">
                            <p className="cancel-reason-label">Выберите причину отмены:</p>
                            <div className="cancel-reason-options">
                                {PREDEFINED_REASONS.map((reason) => (
                                    <label 
                                        key={reason} 
                                        className={`cancel-reason-option ${selectedReason === reason ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="cancelReason"
                                            value={reason}
                                            checked={selectedReason === reason}
                                            onChange={() => handleReasonSelect(reason)}
                                        />
                                        <span>{reason}</span>
                                    </label>
                                ))}
                            </div>

                            {showCustomInput && (
                                <div className="cancel-reason-custom">
                                    <label className="cancel-reason-custom-label">
                                        Укажите причину:
                                    </label>
                                    <textarea
                                        className="cancel-reason-custom-input"
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        placeholder="Опишите причину отмены..."
                                        rows={4}
                                        maxLength={500}
                                    />
                                    <p className="cancel-reason-custom-hint">
                                        {customReason.length}/500 символов
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="cancel-reason-modal-footer">
                        <button 
                            className="cancel-reason-btn cancel-reason-btn-secondary"
                            onClick={handleCancel}
                        >
                            Отмена
                        </button>
                        <button 
                            className="cancel-reason-btn cancel-reason-btn-primary"
                            onClick={handleNext}
                            disabled={!selectedReason || (selectedReason === 'Другая причина' && !customReason.trim())}
                        >
                            Продолжить
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                title="Подтверждение отмены"
                message={
                    `Вы уверены, что хотите отменить бронирование клиента "${clientName}"?\n\n` +
                    `💰 Сумма ${priceFormatter.format(enrollPrice)} будет автоматически возвращена клиенту.\n\n` +
                    `Причина: ${selectedReason === 'Другая причина' ? customReason : selectedReason}\n\n` +
                    `Это действие нельзя отменить.`
                }
                confirmText="Да, отменить"
                cancelText="Нет, оставить"
                variant="danger"
                onConfirm={handleFinalConfirm}
                onCancel={() => setShowConfirmModal(false)}
            />
        </>
    );
};

