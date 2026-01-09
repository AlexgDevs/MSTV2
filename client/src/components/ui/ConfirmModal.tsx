import React from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    onClose?: () => void;
    variant?: 'danger' | 'warning';
    isLoading?: boolean;
    children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    onConfirm,
    onCancel,
    onClose,
    variant = 'danger',
    isLoading = false,
    children
}) => {
    if (!isOpen) return null;

    const handleCancel = onCancel || onClose || (() => {});

    return (
        <div className="modal-overlay" onClick={handleCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                </div>
                <div className="modal-body">
                    {children ? children : message && <p className="modal-message">{message}</p>}
                </div>
                <div className="modal-footer">
                    <button
                        className="btn btn-outline"
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-warning'}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Обработка...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

