import React, { useState } from 'react';
import type { DisputeResponse, WinnerTypes } from '../../api/disputes/types';
import { ConfirmModal } from '../ui/ConfirmModal';
import './ResolveDisputeModal.css';

interface ResolveDisputeModalProps {
    dispute: DisputeResponse;
    onClose: () => void;
    onResolve: (disputeId: number, winnerType: WinnerTypes) => Promise<void>;
}

export const ResolveDisputeModal: React.FC<ResolveDisputeModalProps> = ({
    dispute,
    onClose,
    onResolve
}) => {
    const [selectedWinner, setSelectedWinner] = useState<WinnerTypes>('client');
    const [isResolving, setIsResolving] = useState(false);

    const handleResolve = async () => {
        setIsResolving(true);
        try {
            await onResolve(dispute.id, selectedWinner);
        } finally {
            setIsResolving(false);
        }
    };

    return (
        <ConfirmModal
            isOpen={true}
            onClose={onClose}
            title="Завершить спор"
            confirmText="Завершить"
            onConfirm={handleResolve}
            isLoading={isResolving}
        >
            <div className="resolve-dispute-modal">
                <p className="resolve-dispute-info">
                    Выберите, кому отдать деньги в споре #{dispute.id}
                </p>
                <div className="resolve-dispute-options">
                    <label className="resolve-dispute-option">
                        <input
                            type="radio"
                            name="winner"
                            value="client"
                            checked={selectedWinner === 'client'}
                            onChange={() => setSelectedWinner('client')}
                        />
                        <div className="resolve-dispute-option-content">
                            <span className="resolve-dispute-option-title">Клиенту</span>
                            <span className="resolve-dispute-option-description">
                                Вся сумма возвращается клиенту
                            </span>
                        </div>
                    </label>
                    <label className="resolve-dispute-option">
                        <input
                            type="radio"
                            name="winner"
                            value="master"
                            checked={selectedWinner === 'master'}
                            onChange={() => setSelectedWinner('master')}
                        />
                        <div className="resolve-dispute-option-content">
                            <span className="resolve-dispute-option-title">Мастеру</span>
                            <span className="resolve-dispute-option-description">
                                Вся сумма переходит мастеру
                            </span>
                        </div>
                    </label>
                    <label className="resolve-dispute-option">
                        <input
                            type="radio"
                            name="winner"
                            value="split"
                            checked={selectedWinner === 'split'}
                            onChange={() => setSelectedWinner('split')}
                        />
                        <div className="resolve-dispute-option-content">
                            <span className="resolve-dispute-option-title">Разделить поровну</span>
                            <span className="resolve-dispute-option-description">
                                50% клиенту, 50% мастеру
                            </span>
                        </div>
                    </label>
                </div>
            </div>
        </ConfirmModal>
    );
};

