import React, { useState, useEffect, useRef } from 'react';
import { chatsApi, type DetailServiceChatResponse, type ServiceMessageResponse } from '../../api/chats/chats.api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../stores/auth.store';
import { API } from '../../api/client';
import './ServiceChatWidget.css';

const getWebSocketUrl = (chatId: number, token?: string): string => {
    try {
        // In production, use relative WebSocket URL (same host/port as frontend)
        if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const url = `${wsProtocol}//${window.location.host}/ws/service-chats/${chatId}`;
            return token ? `${url}?token=${encodeURIComponent(token)}` : url;
        }
        
        // Development or when VITE_API_URL is set
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

interface ServiceChatWidgetProps {
    serviceId: number;
    masterId: number;
    masterName: string;
    isMasterOnline?: boolean;
}

export const ServiceChatWidget: React.FC<ServiceChatWidgetProps> = ({
    serviceId,
    masterId,
    masterName,
    isMasterOnline = false,
}) => {
    const { user } = useAuthStore();
    const [chat, setChat] = useState<DetailServiceChatResponse | null>(null);
    const [messages, setMessages] = useState<ServiceMessageResponse[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [wsError, setWsError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const [wsToken, setWsToken] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !serviceId || !masterId) {
            return;
        }
        
        let isMounted = true;
        
        const fetchWsToken = async () => {
            try {
                const response = await API.get<{ access_token: string }>('/auth/ws-token');
                if (isMounted && response?.data?.access_token) {
                    setWsToken(response.data.access_token);
                }
            } catch (error: any) {
            }
        };

        fetchWsToken();
        
        return () => {
            isMounted = false;
        };
    }, [user, serviceId, masterId]);

    useEffect(() => {
        if (!user || !serviceId || !masterId) {
            return;
        }
        
        let isMounted = true;
        
        const fetchChat = async () => {
            try {
                if (isMounted) {
                    setIsLoading(true);
                    setError(null);
                }
                
                const response = await chatsApi.getOrCreateServiceChat(serviceId, masterId);
                
                if (isMounted) {
                    setChat(response.data);
                    setMessages(response.data.messages || []);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err?.response?.data?.detail || 'Не удалось загрузить чат');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchChat();
        
        return () => {
            isMounted = false;
        };
    }, [serviceId, masterId, user]);

    const wsUrl = React.useMemo(() => {
        return chat ? getWebSocketUrl(chat.id, wsToken || undefined) : '';
    }, [chat?.id, wsToken]);

    const { isConnected, sendMessage } = useWebSocket({
        url: wsUrl,
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
                    const filtered = prev.filter(m => 
                        !(m.id > 1000000000000 && m.content === sentMsg.content && m.sender_id === sentMsg.sender_id)
                    );
                    if (filtered.some(m => m.id === sentMsg.id)) {
                        return filtered;
                    }
                    return [...filtered, sentMsg];
                });
            } else if (message.type === 'connected') {
                setWsError(null);
            } else if (message.type === 'error') {
                setError(message.message || 'Ошибка WebSocket');
            }
        },
        onOpen: () => {
            setWsError(null);
        },
        onClose: () => {
        },
        onError: () => {
            setWsError('Ошибка соединения с чатом');
        },
        reconnect: true,
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !isConnected || !user || !chat) return;

        const messageContent = newMessage.trim();
        
        // Оптимистичное обновление - сразу показываем сообщение
        const tempId = Date.now(); // Временный ID
        const optimisticMessage: ServiceMessageResponse = {
            id: tempId,
            content: messageContent,
            sender_id: user.id,
            chat_id: chat.id,
            created_at: new Date().toISOString(),
        };
        
        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage('');

        // Отправляем сообщение на сервер
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

    // Не показываем виджет если нет пользователя
    if (!user) {
        return null;
    }

    // Показываем виджет всегда, даже если чат еще загружается
    if (isLoading || !chat) {
        return (
            <div className="service-chat-widget">
                <div className="service-chat-header">
                    <div className="service-chat-title">Чат с мастером</div>
                    <button
                        className="service-chat-minimize"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        {isMinimized ? '↑' : '↓'}
                    </button>
                </div>
                {!isMinimized && (
                    <div className="service-chat-loading">
                        {error ? error : 'Загрузка чата...'}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`service-chat-widget ${isMinimized ? 'minimized' : ''}`}>
            <div className="service-chat-header">
                <div className="service-chat-header-info">
                    <div className="service-chat-title">Чат с {masterName}</div>
                    <div className="service-chat-status">
                        <span
                            className={`service-chat-status-indicator ${isMasterOnline ? 'online' : 'offline'}`}
                        />
                        <span className="service-chat-status-text">
                            {isMasterOnline ? 'Онлайн' : 'Оффлайн'}
                        </span>
                    </div>
                </div>
                <button
                    className="service-chat-minimize"
                    onClick={() => setIsMinimized(!isMinimized)}
                    aria-label={isMinimized ? 'Развернуть' : 'Свернуть'}
                >
                    {isMinimized ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 15L12 9L6 15" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9L12 15L18 9" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>
            </div>

            {!isMinimized && (
                <>
                    <div className="service-chat-messages">
                        {messages.length === 0 ? (
                            <div className="service-chat-empty">
                                Начните общение с мастером
                            </div>
                        ) : (
                            messages.map((message) => {
                                const isOwn = message.sender_id === user?.id;
                                return (
                                    <div
                                        key={message.id}
                                        className={`service-chat-message ${isOwn ? 'own' : ''}`}
                                    >
                                        <div className="service-chat-message-content">
                                            {message.content}
                                        </div>
                                        <div className="service-chat-message-time">
                                            {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="service-chat-input-container">
                        {!isConnected && (
                            <div className="service-chat-connection-status">
                                {wsError || 'Переподключение...'}
                            </div>
                        )}
                        <div className="service-chat-input-wrapper">
                            <textarea
                                className="service-chat-input"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Напишите сообщение..."
                                disabled={!isConnected}
                                rows={1}
                            />
                            <button
                                className="service-chat-send-button"
                                onClick={handleSendMessage}
                                disabled={!isConnected || !newMessage.trim()}
                                aria-label="Отправить сообщение"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

