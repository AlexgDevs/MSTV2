import type { ScheduleSlotStatus } from './user.types';

export interface ServiceDateResponse {
    date: string;
    slots: Record<string, ScheduleSlotStatus>;
    service_id: number;
}

export interface CreateServiceDateModel {
    date: string;
    slots: Record<string, ScheduleSlotStatus>;
    service_id: number;
}

export interface CreateScheduleTemplateModel {
    day: string;
    hours_work: Record<string, ScheduleSlotStatus>;
    is_active: boolean;
    service_id: number;
}

export interface PatchScheduleTemplateModel {
    day?: string | null;
    hours_work?: Record<string, ScheduleSlotStatus> | null;
    is_active?: boolean | null;
    service_id?: number | null;
}
