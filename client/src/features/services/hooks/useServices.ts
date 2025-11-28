import { useCallback, useEffect, useState } from 'react';
import type { ServiceResponse } from '../../../types/service.types';
import { servicesApi } from '../../../api/services/services.api';

interface UseServicesResult {
    services: ServiceResponse[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useServices = (): UseServicesResult => {
    const [services, setServices] = useState<ServiceResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchServices = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await servicesApi.getAll();
            setServices(data);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Не удалось загрузить услуги';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    return {
        services,
        isLoading,
        error,
        refresh: fetchServices
    };
};
