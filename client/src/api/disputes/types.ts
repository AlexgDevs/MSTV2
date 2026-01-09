export type DisputeStatus = 'wait_for_arbitr' | 'in_process' | 'closed';
export type WinnerTypes = 'client' | 'master' | 'split';

export interface SimpleUserDisputResponse {
    id: number;
    name: string;
    role: 'user' | 'admin' | 'moderator' | 'arbitr';
}

export interface SimpleEnrollDisputResponse {
    id: number;
    slot_time: string;
    status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled' | 'expired';
    price: number;
    created_at: string;
    user_id: number;
    service_id: number;
    service_date_id: number;
}

export interface DisputeResponse {
    id: number;
    client_id: number;
    master_id: number;
    enroll_id: number;
    arbitr_id: number | null;
    reason: string;
    disput_status: DisputeStatus;
    winner_type: WinnerTypes | null;
    created_at: string;
    taken_at: string | null;
    completed_at: string | null;
}

export interface DetailDisputResponse {
    id: number;
    client: SimpleUserDisputResponse;
    master: SimpleUserDisputResponse;
    arbitr: SimpleUserDisputResponse | null;
    enroll: SimpleEnrollDisputResponse;
    reason: string;
    disput_status: DisputeStatus;
    winner_type: WinnerTypes | null;
    created_at: string;
    taken_at: string | null;
    completed_at: string | null;
}

export interface CreateDisputeModel {
    master_id: number;
    enroll_id: number;
    reason: string;
}

export interface TakeDisputeModel {
    dispute_id: number;
}

export interface ResolveDisputeModel {
    dispute_id: number;
    winner_type: WinnerTypes;
}

