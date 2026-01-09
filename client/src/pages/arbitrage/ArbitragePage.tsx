import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { disputesApi } from '../../api/disputes/disputes.api';
import { arbitrageApi } from '../../api/arbitrage/arbitrage.api';
import { disputeChatApi } from '../../api/disputes/disputeChat.api';
import type { DisputeResponse, WinnerTypes } from '../../api/disputes/types';
import { DisputeCard } from '../../components/arbitrage/DisputeCard';
import { ResolveDisputeModal } from '../../components/arbitrage/ResolveDisputeModal';
import '../../assets/styles/ArbitragePage.css';

type TabId = 'available' | 'taken' | 'statistics';

export const ArbitragePage: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>('available');
    const [disputes, setDisputes] = useState<DisputeResponse[]>([]);
    const [statisticsDisputes, setStatisticsDisputes] = useState<DisputeResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<DisputeResponse | null>(null);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'wait_for_arbitr' | 'in_process' | 'closed'>('all');

    // Проверка доступа
    useEffect(() => {
        if (user && user.role !== 'admin' && user.role !== 'arbitr') {
            navigate('/');
        }
    }, [user, navigate]);

    // Загрузка доступных споров
    const loadAvailableDisputes = async (tab: TabId) => {
        try {
            setIsLoading(true);
            const response = await disputesApi.getAll();
            const allDisputes = response.data;
            
            if (tab === 'available') {
                // Открытые споры - только те, что ждут арбитража
                const available = allDisputes.filter(
                    d => d.disput_status === 'wait_for_arbitr'
                );
                setDisputes(available);
            } else if (tab === 'taken') {
                // Взятые мной - только те, что взяты текущим пользователем
                const taken = allDisputes.filter(
                    d => d.disput_status === 'in_process' && d.arbitr_id === user?.id
                );
                setDisputes(taken);
            }
        } catch (error) {
            console.error('Error loading disputes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Загрузка статистики (споры, которые взял пользователь)
    const loadStatistics = async () => {
        try {
            setIsLoading(true);
            const response = await disputesApi.getByArbitr();
            setStatisticsDisputes(response.data);
        } catch (error) {
            console.error('Error loading statistics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'available' || activeTab === 'taken') {
            loadAvailableDisputes(activeTab);
        } else if (activeTab === 'statistics') {
            loadStatistics();
        }
    }, [activeTab, user?.id]);

    const handleTakeDispute = async (disputeId: number) => {
        try {
            await arbitrageApi.takeDispute({ dispute_id: disputeId });
            await loadAvailableDisputes(activeTab);
        } catch (error) {
            console.error('Error taking dispute:', error);
            alert('Ошибка при взятии спора');
        }
    };

    const handleResolveDispute = async (disputeId: number, winnerType: WinnerTypes) => {
        try {
            await arbitrageApi.resolveDispute({ dispute_id: disputeId, winner_type: winnerType });
            setIsResolveModalOpen(false);
            setSelectedDispute(null);
            await loadStatistics();
            if (activeTab === 'available' || activeTab === 'taken') {
                await loadAvailableDisputes(activeTab);
            }
        } catch (error) {
            console.error('Error resolving dispute:', error);
            alert('Ошибка при завершении спора');
        }
    };

    const handleOpenResolveModal = (dispute: DisputeResponse) => {
        setSelectedDispute(dispute);
        setIsResolveModalOpen(true);
    };

    const handleGoToChat = async (dispute: DisputeResponse) => {
        try {
            // Получаем чат по dispute_id
            const chatResponse = await disputeChatApi.getByDisputeId(dispute.id);
            navigate(`/dispute-chats/${chatResponse.data.id}`);
        } catch (error: any) {
            // Если чат не найден, создаем его
            if (error?.response?.status === 404) {
                try {
                    const createResponse = await disputeChatApi.create({ dispute_id: dispute.id });
                    navigate(`/dispute-chats/${createResponse.data.id}`);
                } catch (createError) {
                    console.error('Error creating dispute chat:', createError);
                    alert('Не удалось создать чат для спора');
                }
            } else {
                console.error('Error navigating to chat:', error);
                alert('Не удалось перейти в чат');
            }
        }
    };

    const filteredDisputes = useMemo(() => {
        return disputes.filter(d => {
            if (filter === 'all') return true;
            return d.disput_status === filter;
        });
    }, [disputes, filter]);

    const filteredStatistics = useMemo(() => {
        return statisticsDisputes.filter(d => {
            if (filter === 'all') return true;
            return d.disput_status === filter;
        });
    }, [statisticsDisputes, filter]);

    if (!user || (user.role !== 'admin' && user.role !== 'arbitr')) {
        return null;
    }

    return (
        <div className="arbitrage-page">
            <div className="arbitrage-container">
                <div className="arbitrage-header">
                    <h1 className="arbitrage-title">Арбитраж</h1>
                    <div className="arbitrage-tabs">
                        <button
                            className={`arbitrage-tab ${activeTab === 'available' ? 'active' : ''}`}
                            onClick={() => setActiveTab('available')}
                        >
                            Открытые споры
                        </button>
                        <button
                            className={`arbitrage-tab ${activeTab === 'taken' ? 'active' : ''}`}
                            onClick={() => setActiveTab('taken')}
                        >
                            Взятые мной
                        </button>
                        <button
                            className={`arbitrage-tab ${activeTab === 'statistics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('statistics')}
                        >
                            Статистика работы
                        </button>
                    </div>
                </div>

                <div className="arbitrage-filters">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as typeof filter)}
                        className="arbitrage-filter-select"
                    >
                        <option value="all">Все статусы</option>
                        <option value="wait_for_arbitr">Ожидают арбитража</option>
                        <option value="in_process">В процессе</option>
                        <option value="closed">Закрытые</option>
                    </select>
                </div>

                <div className="arbitrage-content">
                    {isLoading ? (
                        <div className="arbitrage-loading">Загрузка...</div>
                    ) : (
                        <div className="arbitrage-cards">
                            {(activeTab === 'statistics' ? filteredStatistics : filteredDisputes).map((dispute) => (
                                <DisputeCard
                                    key={dispute.id}
                                    dispute={dispute}
                                    mode={activeTab === 'statistics' ? 'statistics' : activeTab === 'taken' ? 'taken' : 'available'}
                                    onTake={() => handleTakeDispute(dispute.id)}
                                    onResolve={() => handleOpenResolveModal(dispute)}
                                    onChat={() => handleGoToChat(dispute)}
                                />
                            ))}
                            {(activeTab === 'statistics' ? filteredStatistics : filteredDisputes).length === 0 && (
                                <div className="arbitrage-empty">
                                    Нет споров для отображения
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isResolveModalOpen && selectedDispute && (
                <ResolveDisputeModal
                    dispute={selectedDispute}
                    onClose={() => {
                        setIsResolveModalOpen(false);
                        setSelectedDispute(null);
                    }}
                    onResolve={handleResolveDispute}
                />
            )}
        </div>
    );
};

