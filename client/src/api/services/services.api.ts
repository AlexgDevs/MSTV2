import { API } from '../client';
import type {
    ServiceResponse,
    DetailServiceResponse,
    CreateServiceModel,
    PatchServiceModel
} from './types';

export const servicesApi = {
    getAll: () => API.get<ServiceResponse[]>('/services'),
    getDetail: (serviceId: number) =>
        API.get<DetailServiceResponse>(`/services/detail/${serviceId}`),
    create: (data: CreateServiceModel) =>
        API.post('/services', data),
    update: (serviceId: number, data: PatchServiceModel) =>
        API.patch(`/services/${serviceId}`, data),
};
