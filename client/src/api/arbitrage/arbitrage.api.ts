import { API } from '../client';
import type { TakeDisputeModel, ResolveDisputeModel } from '../disputes/types';

export const arbitrageApi = {
    takeDispute: (data: TakeDisputeModel) =>
        API.post<{ status: string; dispute_id: number; message: string }>('/arbitrage/take', data),
    
    resolveDispute: (data: ResolveDisputeModel) =>
        API.post<{ 
            status: string; 
            dispute_id: number; 
            winner_type: string; 
            message: string;
            orchestrator_started: boolean;
        }>('/arbitrage/resolve', data),
};

