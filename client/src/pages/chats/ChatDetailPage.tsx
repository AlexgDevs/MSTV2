import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatsApi, type DetailServiceChatResponse, type ServiceMessageResponse } from '../../api/chats/chats.api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../stores/auth.store';
import { API } from '../../api/client';
import './ChatDetailPage.css';

const getWebSocketUrl = (chatId: number, token?: string): string => {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 
            `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
        
        const baseUrl = apiUrl.replace('/api/v1', '').replace(/\/$/, '');
        const wsProtocol = baseUrl.startsWith('https://') ? 'wss://' : 'ws://';
        const wsHost = baseUrl.replace(/^https?:\/\//, '');
        const wsBaseUrl = `${wsProtocol}${wsHost}`;
        
        const url = `${wsBaseUrl}/ws/service-chats/${chatId}`;
        return token ? `${url}?token=${encodeURIComponent(token)}` : url;
    } catch (error) {
        const url = `ws://localhost:8000/ws/service-chats/${chatId}`;
        return token ? `${url}?token=${encodeURIComponent(token)}` : url;
    }
};

export const ChatDetailPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [chat, setChat] = useState<DetailServiceChatResponse | null>(null);
    const [messages, setMessages] = useState<ServiceMessageResponse[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wsToken, setWsToken] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchWsToken = async () => {
            try {
                const response = await API.get<{ access_token: string }>('/auth/ws-token');
                setWsToken(response.data.access_token);
            } catch (error) {
            }
        };
        fetchWsToken();
    }, []);

    useEffect(() => {
        if (!chatId) return;

        const loadChat = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const chatData = await chatsApi.getServiceChatDetail(Number(chatId));
                setChat(chatData.data);
                setMessages(chatData.data.messages || []);
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Не удалось загрузить чат');
            } finally {
                setIsLoading(false);
            }
        };

        loadChat();
    }, [chatId]);

    const { isConnected, sendMessage } = useWebSocket({
        url: chat && wsToken ? getWebSocketUrl(chat.id, wsToken) : '',
        onMessage: (message) => {
            if (message.type === 'message') {
                const newMsg: ServiceMessageResponse = {
                    id: message.id,
                    content: message.content,
                    sender_id: message.sender_id,
                    chat_id: message.chat_id,
                    created_at: message.created_at,
                };
                setMessages((prev) => {
                    if (prev.some(m => m.id === newMsg.id)) {
                        return prev;
                    }
                    return [...prev, newMsg];
                });
            } else if (message.type === 'message_sent') {
                const sentMsg = message.message as ServiceMessageResponse;
                setMessages((prev) => {
                    if (prev.some(m => m.id === sentMsg.id)) {
                        return prev;
                    }
                    const filtered = prev.filter(m => 
                        !(m.id > 1000000000000 && m.content === sentMsg.content && m.sender_id === sentMsg.sender_id)
                    );
                    return [...filtered, sentMsg];
                });
            } else if (message.type === 'error') {
                setError(message.message || 'Ошибка WebSocket');
            }
        },
        onOpen: () => {
        },
        onClose: () => {
        },
        onError: (error) => {
        },
        reconnect: true,
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !isConnected || !user) return;

        const messageContent = newMessage.trim();
        
        const tempId = Date.now();
        const optimisticMessage: ServiceMessageResponse = {
            id: tempId,
            content: messageContent,
            sender_id: user.id,
            chat_id: chat?.id || 0,
            created_at: new Date().toISOString(),
        };
        
        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage('');

        sendMessage({
            type: 'message',
            content: messageContent,
        });
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return 'Сегодня';
        } else if (days === 1) {
            return 'Вчера';
        } else {
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short'
            });
        }
    };

    if (isLoading) {
        return (
            <div className="chat-detail-page">
                <div className="container">
                    <div className="chat-loading">Загрузка чата...</div>
                </div>
            </div>
        );
    }

    if (error || !chat) {
        return (
            <div className="chat-detail-page">
                <div className="container">
                    <div className="chat-error">
                        <p>{error || 'Чат не найден'}</p>
                        <button onClick={() => navigate(-1)} className="btn-back">
                            Назад
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isMaster = user?.id === chat.master.id;
    const otherUser = isMaster ? chat.client : chat.master;

    return (
        <div className="chat-detail-page">
            <div className="container">
                <div className="chat-header">
                    <button onClick={() => navigate(-1)} className="btn-back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Назад
                    </button>
                    <div className="chat-header-info">
                        <div className="chat-header-avatar">
                            {otherUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="chat-header-name">{otherUser.name}</h1>
                            <p className="chat-header-service">
                                Услуга: {chat.service.title}
                            </p>
                        </div>
                    </div>
                    <div className="chat-header-status">
                        {isConnected ? (
                            <span className="status-online">Онлайн</span>
                        ) : (
                            <span className="status-offline">Офлайн</span>
                        )}
                    </div>
                </div>

                <div className="chat-messages">
                    {messages.map((message) => {
                        const isOwnMessage = message.sender_id === user?.id;
                        return (
                            <div
                                key={message.id}
                                className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}
                            >
                                <div className="message-content">
                                    <p>{message.content}</p>
                                    <span className="message-time">
                                        {formatTime(message.created_at)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <textarea
                        className="chat-input"
                        placeholder={isConnected ? "Введите сообщение..." : "Подключение..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={!isConnected}
                        rows={1}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={handleSendMessage}
                        disabled={!isConnected || !newMessage.trim()}
                    >
                        Отправить
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

