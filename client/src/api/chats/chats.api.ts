import { API } from '../client';

export interface ServiceChatResponse {
    id: number;
    service_id: number;
    master_id: number;
    client_id: number;
    created_at: string;
    client?: {
        id: number;
        name: string;
        about?: string | null;
        role: string;
    };
    master?: {
        id: number;
        name: string;
        about?: string | null;
        role: string;
    };
    service?: {
        id: number;
        title: string;
        description: string;
        user_id: number;
        price: number;
    };
}

export interface CreateServiceChatRequest {
    service_id: number;
    master_id: number;
}

export interface ServiceMessageResponse {
    id: number;
    content: string;
    sender_id: number;
    chat_id: number;
    created_at: string;
}

export interface DetailServiceChatResponse extends ServiceChatResponse {
    service: {
        id: number;
        title: string;
        description: string;
        user_id: number;
        price: number;
    };
    master: {
        id: number;
        name: string;
        about?: string | null;
        role: string;
    };
    client: {
        id: number;
        name: string;
        about?: string | null;
        role: string;
    };
    messages: ServiceMessageResponse[];
}

export interface MasterOnlineStatusResponse {
    master_id: number;
    is_online: boolean;
}

export const chatsApi = {
    // Создать чат с мастером
    createServiceChat: async (data: CreateServiceChatRequest) => {
        const response = await API.post<{ status: string; id: number }>('/service-chats/', data);
        return response;
    },

    // Получить все чаты пользователя
    getServiceChats: async () => {
        const response = await API.get<ServiceChatResponse[]>('/service-chats/');
        return response;
    },

    // Получить детали чата
    getServiceChatDetail: async (chatId: number) => {
        const response = await API.get<DetailServiceChatResponse>(`/service-chats/${chatId}`);
        return response;
    },

    // Проверить статус онлайн мастера
    checkMasterOnlineStatus: async (masterId: number) => {
        const response = await API.get<MasterOnlineStatusResponse>(
            `/service-chats/master/${masterId}/online-status`
        );
        return response;
    },

    // Получить или создать чат для услуги
    getOrCreateServiceChat: async (serviceId: number, masterId: number) => {
        try {
            // Сначала пытаемся найти существующий чат
            const chatsResponse = await chatsApi.getServiceChats();
            const existingChat = chatsResponse.data.find(
                (chat) => chat.service_id === serviceId && chat.master_id === masterId
            );
            
            if (existingChat) {
                const detailResponse = await chatsApi.getServiceChatDetail(existingChat.id);
                return detailResponse;
            }
            
            // Если чата нет, создаем новый
            // Сервер сам проверит существование и вернет существующий чат, если он есть
            try {
                const createResponse = await chatsApi.createServiceChat({
                    service_id: serviceId,
                    master_id: masterId,
                });
                
                // Получаем детали созданного чата
                const detailResponse = await chatsApi.getServiceChatDetail(createResponse.data.id);
                return detailResponse;
            } catch (createError: any) {
                // Если возникла ошибка уникальности, пытаемся найти чат снова
                if (createError?.response?.status === 400 || createError?.response?.status === 422) {
                    const chatsResponseRetry = await chatsApi.getServiceChats();
                    const existingChatRetry = chatsResponseRetry.data.find(
                        (chat) => chat.service_id === serviceId && chat.master_id === masterId
                    );
                    
                    if (existingChatRetry) {
                        const detailResponse = await chatsApi.getServiceChatDetail(existingChatRetry.id);
                        return detailResponse;
                    }
                }
                throw createError;
            }
        } catch (error) {
            throw error;
        }
    },
};
