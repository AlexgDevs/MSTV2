import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { disputeChatApi, type DetailDisputeChatResponse, type SimpleDisputeMessageResponse } from '../../api/disputes/disputeChat.api';
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
        
        const url = `${wsBaseUrl}/ws/dispute-chats/${chatId}`;
        return token ? `${url}?token=${encodeURIComponent(token)}` : url;
    } catch (error) {
        const url = `ws://localhost:8000/ws/dispute-chats/${chatId}`;
        return token ? `${url}?token=${encodeURIComponent(token)}` : url;
    }
};

export const DisputeChatDetailPage: React.FC = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [chat, setChat] = useState<DetailDisputeChatResponse | null>(null);
    const [messages, setMessages] = useState<SimpleDisputeMessageResponse[]>([]);
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
                const chatData = await disputeChatApi.getById(Number(chatId));
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
                const newMsg: SimpleDisputeMessageResponse = {
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
                const sentMsg = message.message as SimpleDisputeMessageResponse;
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
        const optimisticMessage: SimpleDisputeMessageResponse = {
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

    const getSenderLabel = (senderId: number): string => {
        if (!chat) return '';
        if (senderId === chat.client.id) return 'Клиент';
        if (senderId === chat.master.id) return 'Мастер';
        if (chat.arbitr && senderId === chat.arbitr.id) return 'Арбитр';
        return '';
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
                    <div className="chat-header-info chat-header-arbitrator">
                        <div className="chat-header-users">
                            <div className="chat-header-user-item">
                                <div className="chat-header-avatar">
                                    {chat.client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="chat-header-name-small">Клиент: {chat.client.name}</h2>
                                </div>
                            </div>
                            <div className="chat-header-user-item">
                                <div className="chat-header-avatar">
                                    {chat.master.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="chat-header-name-small">Мастер: {chat.master.name}</h2>
                                </div>
                            </div>
                            {chat.arbitr && (
                                <div className="chat-header-user-item">
                                    <div className="chat-header-avatar">
                                        {chat.arbitr.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="chat-header-name-small">Арбитр: {chat.arbitr.name}</h2>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="chat-header-service">
                            Спор #{chat.dispute_id}
                        </p>
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
                        const senderLabel = getSenderLabel(message.sender_id);
                        const isFromArbitrator = chat.arbitr && message.sender_id === chat.arbitr.id;
                        
                        return (
                            <div
                                key={message.id}
                                className={`message ${isOwnMessage ? 'message-own' : 'message-other'} ${isFromArbitrator ? 'message-arbitrator' : ''}`}
                            >
                                <div className="message-content">
                                    {senderLabel && (
                                        <span className="message-sender-label">{senderLabel}</span>
                                    )}
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

