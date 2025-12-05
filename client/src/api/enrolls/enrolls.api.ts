import { API } from '../client';
import type { CreateEnrollModel, EnrollResponse } from './types';

import type { EnrollResponse } from './types';

export const enrollsApi = {
    create: (data: CreateEnrollModel) =>
        API.post<{ status: string }>('/enrolls', data),
    cancel: (enrollId: number) =>
        API.post(`/enrolls/${enrollId}/cancel`),
    process: (enrollId: number, action: 'accept' | 'reject') =>
        API.post<{ status: string; enroll_status: string }>(`/enrolls/${enrollId}/process/${action}`),
    getByService: (serviceId: number) =>
        API.get<EnrollResponse[]>(`/enrolls/service/${serviceId}`),
};

