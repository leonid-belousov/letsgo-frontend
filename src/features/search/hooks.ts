import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/api/client';
import type { components, operations } from '@/api/schema';

export type SearchQuery = NonNullable<operations['SearchController_get']['parameters']['query']>;
export type SearchType = NonNullable<SearchQuery['type']>;
export type SearchResponse = components['schemas']['SearchResponseDto'];

export const searchKey = (query: SearchQuery | undefined) => ['search', query] as const;

function queryString(query: SearchQuery) {
  const params = new URLSearchParams({ q: query.q });
  if (query.type) params.set('type', query.type);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  return `?${params.toString()}`;
}

export function useSearch(query: SearchQuery | undefined) {
  return useQuery({
    queryKey: searchKey(query),
    queryFn: ({ signal }) =>
      apiRequest<SearchResponse>(`/v1/search${queryString(query!)}`, { signal }),
    enabled: Boolean(query?.q.trim()),
    retry: false,
  });
}
