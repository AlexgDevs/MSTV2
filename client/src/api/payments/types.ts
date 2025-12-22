export interface CreatePaymentModel {
    enroll_id: number;
    return_url?: string;
}

export interface PaymentResponse {
    payment_id: number;
    confirmation_url: string;
    yookassa_payment_id: string;
}

export interface PaymentStatusResponse {
    status: 'pending' | 'processing' | 'succeeded' | 'canceled' | 'failed';
    yookassa_status?: string;
    confirmation_url?: string;
    paid_at?: string;
}

