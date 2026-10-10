import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { ApiRequestError } from './errors';
import { useSession } from '@/stores/session';

beforeEach(() => {
  useSession.setState({ status: 'signedOut', accessToken: null, refreshToken: null, userId: null });
});

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
  it('maps the common error envelope to ApiRequestError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'CAPACITY_CHANGED', message: 'taken' } }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    await expect(apiRequest('/x')).rejects.toMatchObject({
      code: 'CAPACITY_CHANGED',
      status: 409,
    });
  });

  it('reports network failure as NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')));
    const err = await apiRequest('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).code).toBe('NETWORK');
  });

  it('sends the current access token as a bearer header', async () => {
    useSession.setState({
      status: 'signedIn',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      userId: 'user-1',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/v1/me');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/me'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-1' }),
      }),
    );
  });

  it('shares one refresh request across concurrent 401 responses and retries both calls', async () => {
    useSession.setState({
      status: 'signedIn',
      accessToken: 'old-access',
      refreshToken: 'refresh-1',
      userId: 'user-1',
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v1/auth/refresh')) {
        return new Response(
          JSON.stringify({
            accessToken: 'new-access',
            refreshToken: 'refresh-2',
            expiresIn: 900,
            sessionId: 'session-1',
            userId: 'user-1',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (new Headers(init?.headers).get('Authorization') === 'Bearer new-access') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'expired' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(Promise.all([apiRequest('/v1/me'), apiRequest('/v1/me/profile')])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);

    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/v1/auth/refresh'))).toHaveLength(1);
    expect(useSession.getState().accessToken).toBe('new-access');
    expect(useSession.getState().refreshToken).toBe('refresh-2');
  });
});
