import { API } from '../client';
import type { CreatePaymentModel, PaymentResponse, PaymentStatusResponse } from './types';

export const paymentsApi = {
    create: (data: CreatePaymentModel) =>
        API.post<PaymentResponse>('/payments', data),
    
    getStatus: (paymentId: number) =>
        API.get<PaymentStatusResponse>(`/payments/${paymentId}/status`),
};

