import { API } from '../client';

export interface SimpleServiceForDisputeChatResponse {
    id: number;
    title: string;
    description: string;
    price: number;
}

export interface SimpleEnrollForDisputeChatResponse {
    id: number;
    slot_time: string;
    status: string;
    price: number;
    service_id: number;
    service?: SimpleServiceForDisputeChatResponse;
}

export interface DisputeChatResponse {
    id: number;
    master_id: number;
    client_id: number;
    arbitr_id: number | null;
    enroll_id: number;
    dispute_id: number;
    created_at: string;
    master?: SimpleUserForDisputeChatResponse;
    client?: SimpleUserForDisputeChatResponse;
    arbitr?: SimpleUserForDisputeChatResponse;
    enroll?: SimpleEnrollForDisputeChatResponse;
}

export interface SimpleUserForDisputeChatResponse {
    id: number;
    name: string;
    role: string;
}

export interface SimpleDisputeMessageResponse {
    id: number;
    content: string;
    sender_id: number;
    chat_id: number;
    created_at: string;
    sender?: SimpleUserForDisputeChatResponse;
}

export interface DetailDisputeChatResponse {
    id: number;
    master: SimpleUserForDisputeChatResponse;
    client: SimpleUserForDisputeChatResponse;
    arbitr: SimpleUserForDisputeChatResponse | null;
    enroll_id: number;
    dispute_id: number;
    messages: SimpleDisputeMessageResponse[];
    created_at: string;
}

export interface CreateDisputeChatRequest {
    dispute_id: number;
}

export const disputeChatApi = {
    create: (data: CreateDisputeChatRequest) =>
        API.post<{ status: string; id: number }>('/dispute-chats', data),

    getAll: () => API.get<DisputeChatResponse[]>('/dispute-chats'),

    getById: (chatId: number) =>
        API.get<DetailDisputeChatResponse>(`/dispute-chats/${chatId}`),

    getByDisputeId: (disputeId: number) =>
        API.get<DetailDisputeChatResponse>(`/dispute-chats/by-dispute/${disputeId}`),
};

