export interface CreateEnrollModel {
    service_id: number;
    service_date_id: number;
    slot_time: string;
    price: number;
}

export interface EnrollResponse {
    id: number;
    service_id: number;
    user_id: number;
    service_date_id: number;
    slot_time: string;
    price: number;
    status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled' | 'expired' | 'waiting_payment';
    created_at: string;
    user?: {
        id: number;
        name: string;
        email?: string;
    };
}

