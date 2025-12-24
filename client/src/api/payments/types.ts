export interface CreatePaymentModel {
    enroll_id: number;
    return_url?: string;
}

export interface PaymentServiceInfo {
    id: number | null;
    title: string | null;
    description: string | null;
    master_name: string | null;
}

export interface PaymentResponse {
    id: number;
    enroll_id: number | null;
    yookassa_payment_id: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'succeeded' | 'canceled' | 'failed';
    description: string | null;
    confirmation_url: string | null;
    created_at: string;
    paid_at: string | null;
    service: PaymentServiceInfo | null;
    enroll_date: string | null;
    enroll_time: string | null;
}

export interface PaymentStatusResponse {
    status: 'pending' | 'processing' | 'succeeded' | 'canceled' | 'failed';
    yookassa_status?: string;
    confirmation_url?: string;
    paid_at?: string;
}

