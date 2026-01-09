import React, { useState } from 'react';
import { disputesApi } from '../../api/disputes/disputes.api';
import { Textarea } from '../ui/Textarea';
import './ComplainModal.css';

interface ComplainModalProps {
    isOpen: boolean;
    onClose: () => void;
    enrollId: number;
    masterId: number;
    onSuccess?: () => void;
}

const complaintTemplates = [
    'Мастер не выполнил работу в срок',
    'Качество выполненной работы не соответствует ожиданиям',
    'Мастер не явился на встречу',
    'Мастер нарушил договоренности',
    'Другая причина'
];

export const ComplainModal: React.FC<ComplainModalProps> = ({
    isOpen,
    onClose,
    enrollId,
    masterId,
    onSuccess
}) => {
    const [reason, setReason] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTemplateSelect = (template: string) => {
        if (template === 'Другая причина') {
            setSelectedTemplate('custom');
            setReason('');
        } else {
            setSelectedTemplate(template);
            setReason(template);
        }
        setError(null);
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Пожалуйста, выберите шаблон или опишите причину жалобы');
            return;
        }

        if (reason.trim().length < 10) {
            setError('Описание должно содержать минимум 10 символов');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await disputesApi.create({
                master_id: masterId,
                enroll_id: enrollId,
                reason: reason.trim()
            });
            
            setReason('');
            setSelectedTemplate(null);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Не удалось создать жалобу');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setReason('');
        setSelectedTemplate(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="complain-modal-overlay" onClick={handleCancel}>
            <div className="complain-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="complain-modal-header">
                    <h2 className="complain-modal-title">Подать жалобу</h2>
                    <button
                        className="complain-modal-close"
                        onClick={handleCancel}
                        aria-label="Закрыть"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                
                <div className="complain-modal-body">
                    <p className="complain-modal-info">
                        Выберите причину жалобы или опишите проблему самостоятельно. Арбитраж рассмотрит спор и примет решение.
                    </p>
                    
                    <div className="complain-modal-templates">
                        {complaintTemplates.map((template) => (
                            <button
                                key={template}
                                className={`complain-template-button ${
                                    selectedTemplate === template || 
                                    (selectedTemplate === 'custom' && template === 'Другая причина') ||
                                    (selectedTemplate !== 'custom' && reason === template)
                                        ? 'active' : ''
                                }`}
                                onClick={() => handleTemplateSelect(template)}
                            >
                                {template}
                            </button>
                        ))}
                    </div>

                    {(selectedTemplate === 'custom' || (selectedTemplate && selectedTemplate !== 'custom')) && (
                        <div className="complain-modal-form">
                            <label className="complain-modal-label">
                                {selectedTemplate === 'custom' ? 'Опишите причину жалобы' : 'Дополнительные детали (необязательно)'}
                            </label>
                            <Textarea
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    setError(null);
                                }}
                                placeholder={selectedTemplate === 'custom' 
                                    ? "Опишите проблему подробно..." 
                                    : "Добавьте дополнительные детали, если необходимо..."}
                                rows={6}
                                className="complain-modal-textarea"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="complain-modal-error">
                            {error}
                        </div>
                    )}
                </div>

                <div className="complain-modal-footer">
                    <button
                        className="complain-modal-button complain-modal-button-cancel"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        Отмена
                    </button>
                    <button
                        className="complain-modal-button complain-modal-button-submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !reason.trim()}
                    >
                        {isSubmitting ? 'Отправка...' : 'Отправить жалобу'}
                    </button>
                </div>
            </div>
        </div>
    );
};

