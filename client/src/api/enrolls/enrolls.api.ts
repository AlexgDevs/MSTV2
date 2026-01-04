import { API } from '../client';
import type { CreateEnrollModel, EnrollResponse } from './types';

import type { EnrollResponse } from './types';

export const enrollsApi = {
    create: (data: CreateEnrollModel) =>
        API.post<{ status: string; enroll_id: number }>('/enrolls', data),
    cancel: (enrollId: number) =>
        API.post(`/enrolls/${enrollId}/cancel`),
    process: (enrollId: number, action: 'accept' | 'reject', reason?: string) =>
        API.post<{ status: string; enroll_status: string }>(`/enrolls/${enrollId}/process/${action}`, { reason }),
    getByService: (serviceId: number) =>
        API.get<EnrollResponse[]>(`/enrolls/service/${serviceId}`),
    complete: (enrollId: number) =>
        API.post<{ status: string; enroll_status: string }>(`/enrolls/${enrollId}/complete`),
    confirm: (enrollId: number) =>
        API.post<{ status: string; enroll_status: string }>(`/enrolls/${enrollId}/confirm`),
};

