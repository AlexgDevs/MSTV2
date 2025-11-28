import { useCallback, useEffect, useState } from 'react';
import { serviceDatesApi } from '../../../api/dates/dates.api';
import { servicesApi } from '../../../api/services/services.api';
import type { ServiceDateResponse } from '../../../api/dates/types';
import type { DetailServiceResponse } from '../../../types/service.types';

export const useMasterSchedule = (serviceIds: number[]) => {
    const [schedule, setSchedule] = useState<ServiceDateResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSchedule = useCallback(async () => {
        if (!serviceIds.length) {
            setSchedule([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const { data } = await serviceDatesApi.getAll();
            const filtered = data.filter(date => serviceIds.includes(date.service_id));
            setSchedule(filtered);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Не удалось загрузить расписание';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [serviceIds]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    return {
        schedule,
        isLoading,
        error,
        refresh: fetchSchedule
    };
};

export const useServiceDetail = (serviceId: number | null) => {
    const [detail, setDetail] = useState<DetailServiceResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!serviceId) {
            setDetail(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const { data } = await servicesApi.getDetail(serviceId);
            setDetail(data);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Не удалось загрузить услугу';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [serviceId]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    return {
        detail,
        isLoading,
        error,
        refresh: fetchDetail
    };
};
