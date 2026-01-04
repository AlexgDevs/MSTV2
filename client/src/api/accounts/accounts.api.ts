import { API } from '../client';
import type { CreateAccountModel, AccountResponse, UpdateAccountModel } from './types';

export const accountsApi = {
    create: (data: CreateAccountModel) =>
        API.post<{ status: string; id: number }>('/accounts', data),
    
    get: () =>
        API.get<AccountResponse>('/accounts'),
    
    update: (data: UpdateAccountModel) =>
        API.patch<AccountResponse>('/accounts', data),
};

