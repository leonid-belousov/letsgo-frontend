import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';

export interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiRequest<HealthResponse>('/health', { signal }),
    retry: false,
  });
}
