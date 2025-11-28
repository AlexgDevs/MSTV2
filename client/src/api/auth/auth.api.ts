import { API } from '../client';
import type {
    CreateUserModel,
    PatchUserModel,
    LoginUserModel,
    DetailUserResponse
} from '../../types/user.types';

// Типы для ответов твоих эндпоинтов
interface AuthResponse {
    status: string;
    tokens: {
        access_token: string;
        refresh_token: string;
    };
}

interface TokenResponse {
    status: string;
    tokens: {
        access: string;
        refresh: string;
    };
}

interface CheckAuthResponse {
    status: string;
    user_id: number;
}

export const authApi = {
    // POST /api/v1/auth/register
    register: (data: CreateUserModel) =>
        API.post<AuthResponse>('/auth/register', data),

    // POST /api/v1/auth/token  
    login: (data: LoginUserModel) =>
        API.post<TokenResponse>('/auth/token', data),

    // POST /api/v1/auth/refresh
    refresh: () =>
        API.post<{ status: string; tokens: { access: string } }>('/auth/refresh'),

    // GET /api/v1/auth/check
    check: () =>
        API.get<CheckAuthResponse>('/auth/check'),

    // DELETE /api/v1/auth/logout
    logout: () =>
        API.delete<{ status: string }>('/auth/logout', {
          // Принудительно очищаем куки на клиенте
        withCredentials: true
        }),

    // GET /api/v1/users/me
    getMe: () =>
        API.get<DetailUserResponse>('/users/me'),

    // PATCH /api/v1/users/me
    updateMe: (data: PatchUserModel) =>
        API.patch('/users/me', data),
};