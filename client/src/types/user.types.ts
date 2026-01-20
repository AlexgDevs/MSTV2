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

export interface SimpleServiceAuthor {
    id: number;
    name: string;
}

export interface SimpleServiceInfo {
    id: number;
    title: string;
    description: string;
    user: SimpleServiceAuthor;
}

export interface SimpleServiceEnroll {
    id: number;
    slot_time: string;
    status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled' | 'expired' | 'waiting_payment';
    price: number;
    service_id: number;
    service_date_id: number;
    date?: string | null; // Дата записи (формат: dd-mm-YYYY)
    service?: SimpleServiceInfo | null; // Информация об услуге
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
    about?: string | null;
    recaptcha_token?: string; // Токен Cloudflare Turnstile (используем то же поле для совместимости)
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
    role: 'user' | 'admin' | 'moderator' | 'arbitr';
}

export interface DetailUserResponse {
    id: number;
    name: string;
    email: string;
    about: string | null;
    role: 'user' | 'admin' | 'moderator' | 'arbitr';
    verified_email: boolean;
    templates: SimpleUserScheduleTemplate[];
    services: SimpleUserService[];
    services_enroll: SimpleServiceEnroll[];
    tags: SimpleUserTag[];
}