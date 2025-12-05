import React from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    onConfirm,
    onCancel,
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                </div>
                <div className="modal-body">
                    <p className="modal-message">{message}</p>
                </div>
                <div className="modal-footer">
                    <button
                        className="btn btn-outline"
                        onClick={onCancel}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-warning'}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

