import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialsForm } from './CredentialsForm';
import { useSession } from '@/stores/session';

function renderForm(mode: 'sign-in' | 'sign-up') {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CredentialsForm mode={mode} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useSession.setState({ status: 'signedOut', accessToken: null, refreshToken: null, userId: null });
});

afterEach(() => vi.unstubAllGlobals());

describe('CredentialsForm', () => {
  it('validates required credentials before submitting', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderForm('sign-in');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your e-mail or phone')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs in with an e-mail and stores the returned token pair', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          expiresIn: 900,
          sessionId: 'session-1',
          userId: 'user-1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderForm('sign-in');

    await user.type(screen.getByRole('textbox', { name: /E-mail or phone/ }), 'player@example.test');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      email: 'player@example.test',
      password: 'password123',
      deviceName: 'Let’sGo web',
    });
  });

  it('shows the approved message for invalid backend credentials', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'invalid' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    renderForm('sign-in');

    await user.type(screen.getByRole('textbox', { name: /E-mail or phone/ }), 'player@example.test');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Wrong e-mail/phone or password.')).toBeInTheDocument();
  });

  it('uses the registration endpoint in sign-up mode', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          expiresIn: 900,
          sessionId: 'session-1',
          userId: 'user-1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderForm('sign-up');

    await user.type(screen.getByRole('textbox', { name: /E-mail or phone/ }), 'player@example.test');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => expect(useSession.getState().status).toBe('signedIn'));
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1/auth/register');
  });
});
