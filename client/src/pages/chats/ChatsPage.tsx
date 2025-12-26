import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { chatsApi, type ServiceChatResponse } from '../../api/chats/chats.api';
import { ChatList } from '../../components/chats/ChatList';
import './ChatsPage.css';

export const ChatsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [chats, setChats] = useState<ServiceChatResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const loadChats = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await chatsApi.getServiceChats();
                // Проверяем, что response.data существует и является массивом
                if (response && response.data && Array.isArray(response.data)) {
                    // Фильтруем только чаты где пользователь клиент
                    const clientChats = response.data.filter(chat => chat && chat.client_id === user.id);
                    setChats(clientChats);
                } else {
                    setChats([]);
                }
            } catch (error) {
                console.error('Error loading chats:', error);
                setError(error instanceof Error ? error.message : 'Не удалось загрузить чаты');
                setChats([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadChats();
    }, [user]);

    if (!user) {
        return null;
    }

    return (
        <div className="chats-page">
            <div className="container">
                <div className="chats-header">
                    <h1 className="chats-title">Мои чаты</h1>
                    <p className="chats-subtitle">
                        {chats.length ? `Всего чатов: ${chats.length}` : 'Чатов пока нет'}
                    </p>
                </div>
                <div className="chats-content">
                    <ChatList
                        chats={chats}
                        isLoading={isLoading}
                        error={error}
                        currentUserId={user.id}
                        showMasterInfo={false}
                    />
                </div>
            </div>
        </div>
    );
};

