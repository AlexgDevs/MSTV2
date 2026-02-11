export type PayoutMethod = 'bank_card' | 'yoo_money' | 'sbp' | 'bank_account' | 'self_employed';
export type AccountStatus = 'pending' | 'verified' | 'rejected';

export interface CreateAccountModel {
    payout_method: PayoutMethod;
    card_number?: string;
    bank_account?: string;
    yoomoney_wallet?: string;
    phone?: string;
    full_name: string;
    inn?: string;
}

export interface UpdateAccountModel {
    payout_method?: PayoutMethod;
    card_number?: string;
    bank_account?: string;
    yoomoney_wallet?: string;
    phone?: string;
    full_name?: string;
    inn?: string;
    is_active?: boolean;
}

export interface AccountResponse {
    id: number;
    payout_method: PayoutMethod;
    card_number: string | null;
    bank_account: string | null;
    yoomoney_wallet: string | null;
    phone: string | null;
    full_name: string;
    inn: string | null;
    status: AccountStatus;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    user_id: number;
    balance: number;
    frozen_balance: number;
}

