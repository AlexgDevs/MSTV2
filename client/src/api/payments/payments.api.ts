import { API } from '../client';
import type { CreatePaymentModel, PaymentResponse, PaymentStatusResponse } from './types';

export const paymentsApi = {
    create: (data: CreatePaymentModel) =>
        API.post<{ payment_id: number; confirmation_url: string; yookassa_payment_id: string }>('/payments', data),
    
    getStatus: (paymentId: number) =>
        API.get<PaymentStatusResponse>(`/payments/${paymentId}/status`),
    
    getAll: (limit: number = 50, offset: number = 0) =>
        API.get<PaymentResponse[]>(`/payments?limit=${limit}&offset=${offset}`),
};

