import { z } from 'zod';
import { useSession, type TokenPair } from '@/stores/session';
import { API_ERROR_CODES, ApiRequestError } from './errors';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000'),
});

export const config = envSchema.parse(import.meta.env);

const errorEnvelope = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Required by the backend for double-apply-sensitive writes. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const current = useSession.getState();
  if (!current.refreshToken) return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const pair = await request<TokenPair>(
        '/v1/auth/refresh',
        { method: 'POST', body: { refreshToken: current.refreshToken } },
        false,
      );
      await useSession.getState().signIn({
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        userId: pair.userId,
      });
      return true;
    } catch {
      await useSession.getState().signOut();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestOptions,
  retryOnUnauthorized: boolean,
): Promise<T> {
  const { method = 'GET', body, idempotencyKey, signal } = options;
  const accessToken = useSession.getState().accessToken;
  const headers = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...(accessToken && !path.startsWith('/v1/auth/')
      ? { Authorization: `Bearer ${accessToken}` }
      : {}),
  };
  let res: Response;
  try {
    res = await fetch(`${config.VITE_API_BASE_URL}${path}`, {
      method,
      signal,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiRequestError('NETWORK', 'Network request failed', 0);
  }

  if (
    res.status === 401 &&
    retryOnUnauthorized &&
    !path.startsWith('/v1/auth/') &&
    useSession.getState().refreshToken
  ) {
    if (await refreshAccessToken()) return request(path, options, false);
  }

  if (!res.ok) {
    const parsed = errorEnvelope.safeParse(await res.json().catch(() => null));
    if (parsed.success) {
      const { code, message, details, requestId } = parsed.data.error;
      throw new ApiRequestError(code, message, res.status, details, requestId);
    }
    throw new ApiRequestError('UNKNOWN', res.statusText || 'Request failed', res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Minimal typed fetch wrapper. Authorization is retried once after a single-flight
 * refresh; the backend remains the only authority on permissions.
 */
export function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request(path, options, true);
}
