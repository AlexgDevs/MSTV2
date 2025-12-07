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
    create: (data: CreateServiceModel & { existing_tags?: string; custom_tags?: string }, photoFile?: File) => {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('price', data.price.toString());
        
        if (photoFile) {
            formData.append('photo', photoFile);
        } else if (data.photo) {
            formData.append('photo_url', data.photo);
        }
        
        if (data.existing_tags) {
            formData.append('existing_tags', data.existing_tags);
        }
        
        if (data.custom_tags) {
            formData.append('custom_tags', data.custom_tags);
        }
        
        return API.post('/services', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    update: (serviceId: number, data: PatchServiceModel, photoFile?: File) => {
        const formData = new FormData();
        
        if (data.title !== undefined) formData.append('title', data.title);
        if (data.description !== undefined) formData.append('description', data.description);
        if (data.price !== undefined) formData.append('price', data.price.toString());
        
        if (photoFile) {
            formData.append('photo', photoFile);
        } else if (data.photo !== undefined) {
            if (data.photo) {
                formData.append('photo_url', data.photo);
            }
        }
        
        return API.patch(`/services/${serviceId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    delete: (serviceId: number) => API.delete(`/services/${serviceId}`),
};
