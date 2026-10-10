import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/api/client';
import type { components, operations } from '@/api/schema';

export type GameListQuery = NonNullable<operations['GamesController_list']['parameters']['query']>;
export type GamePage = components['schemas']['GamePageDto'];
export type GameSummary = components['schemas']['GameSummaryDto'];
export type Game = components['schemas']['GameDto'];

export const gamesKey = (filters: GameListQuery = {}) => ['games', filters] as const;

function queryString(filters: GameListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export function useGames(filters: GameListQuery = {}) {
  return useQuery({
    queryKey: gamesKey(filters),
    queryFn: ({ signal }) => apiRequest<GamePage>(`/v1/games${queryString(filters)}`, { signal }),
    retry: false,
  });
}

export function useGame(id: string | undefined) {
  return useQuery({
    queryKey: ['game', id] as const,
    queryFn: ({ signal }) => apiRequest<Game>(`/v1/games/${id}`, { signal }),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useJoinGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teamId }: { id: string; teamId?: string }) =>
      apiRequest<components['schemas']['ParticipationDto']>(`/v1/games/${id}/join`, {
        method: 'POST',
        body: teamId ? { teamId } : {},
        idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `${id}-${Date.now()}`,
      }),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['game', id] });
      void queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useLeaveGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/v1/games/${id}/participation`, {
        method: 'DELETE',
        idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `${id}-${Date.now()}`,
      }),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: ['game', id] });
      void queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}
