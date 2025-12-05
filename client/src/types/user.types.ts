// Это аналоги твоих Pydantic моделей

export type ScheduleSlotStatus = 'available' | 'booked' | 'break' | 'unavailable';

export interface SimpleUserScheduleTemplate {
    id: number;
    day: string;
    hours_work: Record<string, ScheduleSlotStatus>;
    is_active: boolean;
    service_id: number | null;
}

export interface SimpleUserService {
    id: number;
    title: string;
    description: string;
    price: number;
    photo: string | null;
    created_at: string; // Date в JSON приходит как string
}

export interface SimpleServiceEnroll {
    id: number;
    slot_time: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';
    price: number;
    service_id: number;
    service_date_id: number;
}

export interface SimpleUserTag {
    id: number;
    title: string;
    service_id: number | null;
    created_at: string;
}

// ==================== REQUEST MODELS ====================

export interface CreateUserModel {
    name: string;
    password: string;
    email: string;
    verified_token: string;
    about?: string | null;
}

export interface PatchUserModel {
    name?: string | null;
    password?: string | null;
    email?: string | null;
    about?: string | null;
}

export interface LoginUserModel {
    name: string;
    password: string;
}

// ==================== RESPONSE MODELS ====================

export interface UserResponse {
    id: number;
    name: string;
    about: string | null;
    role: 'user' | 'admin' | 'moderator';
}

export interface DetailUserResponse {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'moderator';
    templates: SimpleUserScheduleTemplate[];
    services: SimpleUserService[];
    services_enroll: SimpleServiceEnroll[];
    tags: SimpleUserTag[];
}