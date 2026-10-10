import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompleteProfilePage } from './pages';
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

describe('CompleteProfilePage', () => {
  it('submits the required profile fields with the current version', async () => {
    const user = userEvent.setup();
    let profileComplete = false;
    let updateBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = String(input);
        if (url.endsWith('/v1/me/profile')) {
          updateBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
          profileComplete = true;
          return new Response(JSON.stringify({ profileComplete: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            id: 'user-1',
            nickname: profileComplete ? 'Nika' : null,
            username: profileComplete ? 'nika' : null,
            dateOfBirth: profileComplete ? '1990-01-01' : null,
            city: profileComplete ? 'Baku' : null,
            bio: null,
            avatarId: null,
            visibility: 'PUBLIC',
            profileComplete,
            version: 7,
            email: 'player@example.test',
            phone: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CompleteProfilePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByRole('heading', { name: 'Complete your profile' });
    await user.type(screen.getByRole('textbox', { name: /Nickname/ }), 'Nika');
    await user.type(screen.getByRole('textbox', { name: /Username/ }), 'nika');
    await user.type(screen.getByLabelText(/Date of birth/), '1990-01-01');
    await user.type(screen.getByRole('textbox', { name: /City/ }), 'Baku');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(updateBody).toMatchObject({
        nickname: 'Nika',
        username: 'nika',
        dateOfBirth: '1990-01-01',
        city: 'Baku',
        version: 7,
      }),
    );
  });
});
