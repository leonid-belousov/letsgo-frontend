import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage, SettingsPage } from './pages';
import { useSession } from '@/stores/session';

beforeEach(() => {
  useSession.setState({
    status: 'signedIn',
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    userId: 'user-1',
  });
});

afterEach(() => vi.unstubAllGlobals());

function renderPage(element: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const profile = {
  id: 'user-1',
  nickname: 'Player One',
  username: 'player-one',
  dateOfBirth: '1990-01-01',
  city: 'Tashkent',
  bio: 'Forward',
  avatarId: null,
  visibility: 'PUBLIC',
  profileComplete: true,
  version: 3,
  email: 'player@example.test',
  phone: null,
};

describe('profile and settings routes', () => {
  it('saves profile edits with the server version', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v1/me')) {
        return new Response(JSON.stringify(profile), { status: 200 });
      }
      if (url.endsWith('/v1/me/profile')) {
        expect(init?.method).toBe('PATCH');
        expect(JSON.parse(String(init?.body))).toMatchObject({
          nickname: 'Updated player',
          version: 3,
        });
        return new Response(
          JSON.stringify({ ...profile, nickname: 'Updated player', version: 4 }),
          {
            status: 200,
          },
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<ProfilePage />);
    await user.clear(await screen.findByLabelText('Nickname'));
    await user.type(screen.getByLabelText('Nickname'), 'Updated player');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/me/profile'),
        expect.anything(),
      ),
    );
  });

  it('saves privacy and revokes a non-current session', async () => {
    const user = userEvent.setup();
    const privacy = {
      profileVisibility: 'PUBLIC',
      postsAudience: 'EVERYONE',
      historyAudience: 'EVERYONE',
      statsAudience: 'EVERYONE',
      awardsAudience: 'EVERYONE',
      clubsAudience: 'EVERYONE',
      ratingsAudience: 'EVERYONE',
      cityAudience: 'EVERYONE',
      ageAudience: 'EVERYONE',
      followListAudience: 'EVERYONE',
      messagePolicy: 'EVERYONE',
      invitationPolicy: 'EVERYONE',
      mentionPolicy: 'EVERYONE',
      reviewTags: false,
      externalMediaSharing: false,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v1/me/privacy') && (init?.method ?? 'GET') === 'GET') {
        return new Response(JSON.stringify(privacy), { status: 200 });
      }
      if (url.endsWith('/v1/auth/sessions') && (init?.method ?? 'GET') === 'GET') {
        return new Response(
          JSON.stringify([
            {
              id: 'session-current',
              deviceName: 'Browser',
              createdAt: '2030-01-01T00:00:00Z',
              lastUsedAt: '2030-01-02T00:00:00Z',
              expiresAt: '2030-02-01T00:00:00Z',
              current: true,
            },
            {
              id: 'session-old',
              deviceName: 'Phone',
              createdAt: '2030-01-01T00:00:00Z',
              lastUsedAt: '2030-01-02T00:00:00Z',
              expiresAt: '2030-02-01T00:00:00Z',
              current: false,
            },
          ]),
          { status: 200 },
        );
      }
      if (url.endsWith('/v1/me/privacy')) {
        expect(init?.method).toBe('PATCH');
        expect(JSON.parse(String(init?.body))).toMatchObject({ profileVisibility: 'PRIVATE' });
        return new Response(JSON.stringify({ ...privacy, profileVisibility: 'PRIVATE' }), {
          status: 200,
        });
      }
      if (url.endsWith('/v1/auth/sessions/session-old')) {
        expect(init?.method).toBe('DELETE');
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<SettingsPage />);
    await user.selectOptions(await screen.findByLabelText('Profile visibility'), 'PRIVATE');
    await user.click(screen.getByRole('button', { name: 'Save privacy settings' }));
    await user.click(screen.getByRole('button', { name: 'Revoke session' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/me/privacy'),
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/sessions/session-old'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
