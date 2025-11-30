import { API } from '../client';
import type { CreateScheduleTemplateModel, PatchScheduleTemplateModel } from '../dates/types';

export const templatesApi = {
    create: (data: CreateScheduleTemplateModel) => API.post('/templates', data),
    update: (templateId: number, data: PatchScheduleTemplateModel) =>
        API.patch(`/templates/${templateId}`, data),
    delete: (templateId: number) => API.delete(`/templates/${templateId}`),
    getByService: (serviceId: number) => API.get(`/templates/by/${serviceId}`),
};


