import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServiceChatResponse } from '../../api/chats/chats.api';
import './ChatList.css';

interface ChatListProps {
    chats: ServiceChatResponse[];
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

    const handleChatClick = (chatId: number) => {
        navigate(`/chats/${chatId}`);
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
            {chats.map((chat) => (
                <div
                    key={chat.id}
                    className="chat-item"
                    onClick={() => handleChatClick(chat.id)}
                >
                    <div className="chat-item-avatar">
                        {showMasterInfo 
                            ? (chat.client?.name || 'К').charAt(0).toUpperCase()
                            : (chat.master?.name || 'М').charAt(0).toUpperCase()
                        }
                    </div>
                    <div className="chat-item-content">
                        <div className="chat-item-header">
                            <h3 className="chat-item-name">
                                {showMasterInfo 
                                    ? chat.client?.name || `Клиент #${chat.client_id}`
                                    : chat.master?.name || `Мастер #${chat.master_id}`
                                }
                            </h3>
                            <span className="chat-item-date">
                                {formatDate(chat.created_at)}
                            </span>
                        </div>
                        {chat.service ? (
                            <p className="chat-item-service">
                                Услуга: {chat.service.title}
                            </p>
                        ) : chat.service_id ? (
                            <p className="chat-item-service">
                                Услуга ID: {chat.service_id}
                            </p>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
};

