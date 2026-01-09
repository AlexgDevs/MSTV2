import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { chatsApi, type ServiceChatResponse } from '../../api/chats/chats.api';
import { disputeChatApi, type DisputeChatResponse } from '../../api/disputes/disputeChat.api';
import { ChatList } from '../../components/chats/ChatList';
import './ChatsPage.css';

export type UnifiedChatItem = 
    | (ServiceChatResponse & { type: 'service' })
    | (DisputeChatResponse & { type: 'dispute' });

export const ChatsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [chats, setChats] = useState<UnifiedChatItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const loadChats = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Загружаем оба типа чатов параллельно
                const [serviceChatsResponse, disputeChatsResponse] = await Promise.all([
                    chatsApi.getServiceChats().catch(() => ({ data: [] })),
                    disputeChatApi.getAll().catch(() => ({ data: [] }))
                ]);

                const serviceChats: UnifiedChatItem[] = 
                    (serviceChatsResponse.data || [])
                        .filter(chat => {
                            // Для клиента показываем чаты где он клиент
                            // Для мастера показываем чаты где он мастер
                            return user.role === 'user' 
                                ? chat.client_id === user.id
                                : chat.master_id === user.id;
                        })
                        .map(chat => ({ ...chat, type: 'service' as const }));

                const disputeChats: UnifiedChatItem[] = 
                    (disputeChatsResponse.data || [])
                        .map(chat => ({ ...chat, type: 'dispute' as const }));

                // Объединяем и сортируем по дате создания (новые сверху)
                const allChats = [...serviceChats, ...disputeChats].sort((a, b) => {
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    return dateB - dateA;
                });

                setChats(allChats);
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
                        showMasterInfo={user.role !== 'user'}
                    />
                </div>
            </div>
        </div>
    );
};

