export interface ServiceResponse {
    id: number;
    title: string;
    description: string;
    user_id: number;
    price: number;
    photo: string;
    tags: SimpleServiceTagResponse[];
}

export interface SimpleServiceTemplateResponse {
    id: number;
    day: string;
    hours_work: Record<string, string>;
    is_active: boolean;
    user_id: number;
}

export interface SimpleServiceDateResponse {
    id: number;
    date: string;
    slots: Record<string, string>;
}

export interface SimpleServiceTagResponse {
    id: number;
    title: string;
}

export interface SimpleServiceUserResponse {
    id: number;
    name: string;
    about: string | null;
    role: 'user' | 'admin' | 'moderator';
}

export interface SimpleServiceUserEnroll {
    user: SimpleServiceUserResponse;
}

export interface DetailServiceResponse extends ServiceResponse {
    templates: SimpleServiceTemplateResponse[];
    tags: SimpleServiceTagResponse[];
    dates: SimpleServiceDateResponse[];
    user: SimpleServiceUserResponse;
    users_enroll: SimpleServiceUserEnroll[];
}

export interface CreateServiceModel {
    title: string;
    description: string;
    price: number;
    photo: string;
}

export interface PatchServiceModel {
    title?: string | null;
    description?: string | null;
    price?: number | null;
    photo?: string | null;
}
