import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServiceChatResponse } from '../../api/chats/chats.api';
import type { DisputeChatResponse } from '../../api/disputes/disputeChat.api';
import type { UnifiedChatItem } from '../../pages/chats/ChatsPage';
import './ChatList.css';

interface ChatListProps {
    chats: UnifiedChatItem[];
    isLoading?: boolean;
    error?: string | null;
    currentUserId: number;
    showMasterInfo?: boolean; // true для мастера (показывать клиента), false для клиента (показывать мастера)
}

export const ChatList: React.FC<ChatListProps> = ({
    chats,
    isLoading,
    error,
    currentUserId,
    showMasterInfo = false
}) => {
    const navigate = useNavigate();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return 'Сегодня';
        } else if (days === 1) {
            return 'Вчера';
        } else if (days < 7) {
            return `${days} дн. назад`;
        } else {
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    };

    const handleChatClick = (chat: UnifiedChatItem) => {
        if (chat.type === 'dispute') {
            navigate(`/dispute-chats/${chat.id}`);
        } else {
            navigate(`/chats/${chat.id}`);
        }
    };

    if (isLoading) {
        return (
            <div className="chat-list-loading">
                Загрузка чатов...
            </div>
        );
    }

    if (error) {
        return (
            <div className="chat-list-error">
                Ошибка загрузки чатов: {error}
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="chat-list-empty">
                <div className="chat-list-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h3 className="chat-list-empty-title">У вас пока нет чатов</h3>
                <p className="chat-list-empty-description">Начните общение с мастером через услугу</p>
            </div>
        );
    }

    return (
        <div className="chat-list">
            {chats.map((chat) => {
                const isDispute = chat.type === 'dispute';
                const disputeChat = isDispute ? chat as DisputeChatResponse & { type: 'dispute' } : null;
                const serviceChat = !isDispute ? chat as ServiceChatResponse & { type: 'service' } : null;

                // Определяем собеседника
                let otherUserName = '';
                let otherUserInitial = '';
                if (isDispute && disputeChat) {
                    if (currentUserId === disputeChat.client_id) {
                        otherUserName = disputeChat.master?.name || `Мастер #${disputeChat.master_id}`;
                        otherUserInitial = (disputeChat.master?.name || 'М').charAt(0).toUpperCase();
                    } else if (currentUserId === disputeChat.master_id) {
                        otherUserName = disputeChat.client?.name || `Клиент #${disputeChat.client_id}`;
                        otherUserInitial = (disputeChat.client?.name || 'К').charAt(0).toUpperCase();
                    } else if (disputeChat.arbitr_id === currentUserId) {
                        otherUserName = 'Спор';
                        otherUserInitial = 'С';
                    }
                } else if (serviceChat) {
                    otherUserName = showMasterInfo 
                        ? serviceChat.client?.name || `Клиент #${serviceChat.client_id}`
                        : serviceChat.master?.name || `Мастер #${serviceChat.master_id}`;
                    otherUserInitial = showMasterInfo 
                        ? (serviceChat.client?.name || 'К').charAt(0).toUpperCase()
                        : (serviceChat.master?.name || 'М').charAt(0).toUpperCase();
                }

                // Определяем описание
                let description = '';
                if (isDispute && disputeChat) {
                    if (disputeChat.enroll?.service) {
                        description = `Спор по записи: ${disputeChat.enroll.service.title}`;
                    } else {
                        description = `Спор #${disputeChat.dispute_id}`;
                    }
                } else if (serviceChat) {
                    description = serviceChat.service 
                        ? `Услуга: ${serviceChat.service.title}`
                        : serviceChat.service_id 
                            ? `Услуга ID: ${serviceChat.service_id}`
                            : '';
                }

                return (
                    <div
                        key={`${chat.type}-${chat.id}`}
                        className={`chat-item ${isDispute ? 'chat-item-dispute' : ''}`}
                        onClick={() => handleChatClick(chat)}
                    >
                        <div className="chat-item-avatar">
                            {otherUserInitial}
                        </div>
                        <div className="chat-item-content">
                            <div className="chat-item-header">
                                <h3 className="chat-item-name">
                                    {otherUserName}
                                    {isDispute && (
                                        <span className="chat-item-badge">Спор</span>
                                    )}
                                </h3>
                                <span className="chat-item-date">
                                    {formatDate(chat.created_at)}
                                </span>
                            </div>
                            {description && (
                                <p className="chat-item-service">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

