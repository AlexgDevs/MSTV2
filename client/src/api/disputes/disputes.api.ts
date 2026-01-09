import { API } from '../client';
import type {
    DisputeResponse,
    DetailDisputResponse,
    CreateDisputeModel
} from './types';

export const disputesApi = {
    getAll: () => API.get<DisputeResponse[]>('/disputes'),
    
    getByClient: () => API.get<DisputeResponse[]>('/disputes/by-client'),
    
    getByMaster: () => API.get<DisputeResponse[]>('/disputes/by-master'),
    
    getByArbitr: () => API.get<DisputeResponse[]>('/disputes/by-arbitr'),
    
    getDetail: (disputeId: number) =>
        API.get<DetailDisputResponse>(`/disputes/${disputeId}`),
    
    create: (data: CreateDisputeModel) =>
        API.post<DisputeResponse>('/disputes', data),
    
    delete: (disputeId: number) =>
        API.delete<{ status: string; message: string }>(`/disputes/${disputeId}`),
};

