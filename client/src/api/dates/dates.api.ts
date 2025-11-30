import { API } from '../client';
import type { ServiceDateResponse, CreateServiceDateModel } from './types';

export const serviceDatesApi = {
    getAll: () => API.get<ServiceDateResponse[]>('/dates'),
    create: (data: CreateServiceDateModel) => API.post('/dates', data),
};

