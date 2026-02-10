import { API } from '../client';
import type { CreatePaymentModel, PaymentResponse, PaymentStatusResponse } from './types';

type CreatePaymentResponse = {
    payment_id: number;
    confirmation_url: string | null;
    yookassa_payment_id: string | null;
};

export const paymentsApi = {
    create: (data: CreatePaymentModel) =>
        API.post<CreatePaymentResponse>('/payments', data),
    
    getStatus: (paymentId: number) =>
        API.get<PaymentStatusResponse>(`/payments/${paymentId}/status`),
    
    getAll: (limit: number = 50, offset: number = 0) =>
        API.get<PaymentResponse[]>(`/payments?limit=${limit}&offset=${offset}`),

    confirmCompletion: (enrollId: number) =>
        API.post<{ status: string; message: string }>(`/payments/${enrollId}/confirm`),
};

