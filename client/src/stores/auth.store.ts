import { create } from 'zustand';
import { authApi } from '../api/auth/auth.api';
import type {
    DetailUserResponse,
    LoginUserModel,
    CreateUserModel,
    PatchUserModel
} from '../types/user.types';

interface AuthStore {
    user: DetailUserResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    login: (data: LoginUserModel) => Promise<void>;
    register: (data: CreateUserModel) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    updateProfile: (data: PatchUserModel) => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,

    login: async (data: LoginUserModel) => {
        await authApi.login(data);
        const response = await authApi.getMe();
        set({
            user: response.data,
            isAuthenticated: true
        });
    },

    register: async (data: CreateUserModel) => {
        await authApi.register(data);
        // После регистрации пользователь авторизован, но email не подтвержден
        // Получаем данные пользователя для сохранения в стейте
        try {
            const response = await authApi.getMe();
            set({
                user: response.data,
                isAuthenticated: true
            });
        } catch (error) {
            // Если не удалось получить данные, все равно считаем авторизованным
            // так как токены уже установлены
            set({
                isAuthenticated: true
            });
        }
    },

    logout: async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.log('Ошибка при выходе:', error);
        } finally {
            set({ user: null, isAuthenticated: false });
        }
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            // Проверяем авторизацию - interceptor автоматически обновит токен при необходимости
            await authApi.check();
            // Если проверка прошла успешно, получаем данные пользователя
            const response = await authApi.getMe();
            set({
                user: response.data,
                isAuthenticated: true,
                isLoading: false
            });
        } catch (error) {
            // Если проверка не прошла (нет токенов или они невалидны), пользователь не авторизован
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false
            });
        }
    },

    updateProfile: async (data: PatchUserModel) => {
        await authApi.updateMe(data);
        const response = await authApi.getMe();
        set({
            user: response.data,
            isAuthenticated: true
        });
    },

    refreshUser: async () => {
        try {
            const response = await authApi.getMe();
            set({
                user: response.data,
                isAuthenticated: true
            });
        } catch (error) {
            // Если не удалось получить данные, проверяем авторизацию
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            await useAuthStore.getState().checkAuth();
        }
    }
}));