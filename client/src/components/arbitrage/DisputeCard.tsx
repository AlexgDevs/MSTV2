import React, { useState, useRef, useEffect } from 'react';
import type { DisputeResponse } from '../../api/disputes/types';
import { cn } from '../../utils/cn';
import './DisputeCard.css';

interface DisputeCardProps {
    dispute: DisputeResponse;
    mode: 'available' | 'taken' | 'statistics';
    onTake?: () => void;
    onResolve?: () => void;
    onChat?: () => void;
}

export const DisputeCard: React.FC<DisputeCardProps> = ({
    dispute,
    mode,
    onTake,
    onResolve,
    onChat
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'wait_for_arbitr':
                return 'Ожидает арбитража';
            case 'in_process':
                return 'В процессе';
            case 'closed':
                return 'Закрыт';
            default:
                return status;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'wait_for_arbitr':
                return 'status-waiting';
            case 'in_process':
                return 'status-in-process';
            case 'closed':
                return 'status-closed';
            default:
                return '';
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="dispute-card">
            <div className="dispute-card-header">
                <div className="dispute-card-title">
                    <span className="dispute-id">Спор #{dispute.id}</span>
                    <span className={cn('dispute-status', getStatusClass(dispute.disput_status))}>
                        {getStatusLabel(dispute.disput_status)}
                    </span>
                </div>
                {mode === 'statistics' && (
                    <div className="dispute-card-menu" ref={menuRef}>
                        <button
                            className="dispute-menu-button"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Меню"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="5" r="1"/>
                                <circle cx="12" cy="12" r="1"/>
                                <circle cx="12" cy="19" r="1"/>
                            </svg>
                        </button>
                        {isMenuOpen && (
                            <div className="dispute-menu-dropdown">
                                <button
                                    className="dispute-menu-item"
                                    onClick={() => {
                                        onResolve?.();
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    Завершить спор
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="dispute-card-content">
                <div className="dispute-info-row">
                    <span className="dispute-label">Причина:</span>
                    <span className="dispute-value">{dispute.reason}</span>
                </div>
                <div className="dispute-info-row">
                    <span className="dispute-label">Создан:</span>
                    <span className="dispute-value">{formatDate(dispute.created_at)}</span>
                </div>
                {dispute.taken_at && (
                    <div className="dispute-info-row">
                        <span className="dispute-label">Взят:</span>
                        <span className="dispute-value">{formatDate(dispute.taken_at)}</span>
                    </div>
                )}
                {dispute.completed_at && (
                    <div className="dispute-info-row">
                        <span className="dispute-label">Завершен:</span>
                        <span className="dispute-value">{formatDate(dispute.completed_at)}</span>
                    </div>
                )}
                {dispute.winner_type && (
                    <div className="dispute-info-row">
                        <span className="dispute-label">Победитель:</span>
                        <span className="dispute-value">
                            {dispute.winner_type === 'client' ? 'Клиент' : 
                             dispute.winner_type === 'master' ? 'Мастер' : 'Разделено'}
                        </span>
                    </div>
                )}
            </div>

            <div className="dispute-card-actions">
                {mode === 'available' && dispute.disput_status === 'wait_for_arbitr' && (
                    <button
                        className="dispute-action-button dispute-action-primary"
                        onClick={onTake}
                    >
                        Взять спор
                    </button>
                )}
                {mode === 'statistics' && (
                    <button
                        className="dispute-action-button dispute-action-secondary"
                        onClick={onChat}
                    >
                        Перейти в чат
                    </button>
                )}
            </div>
        </div>
    );
};

