import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireAuth } from './guards';
import { useSession } from '@/stores/session';

function renderGuarded(
  status: 'signedIn' | 'signedOut',
  profileComplete = true,
  initialEntry = '/',
) {
  useSession.setState({
    status,
    accessToken: status === 'signedIn' ? 'access-1' : null,
    refreshToken: status === 'signedIn' ? 'refresh-1' : null,
    userId: status === 'signedIn' ? 'user-1' : null,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ profileComplete }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  const router = createMemoryRouter(
    [
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <h1>Private home</h1> },
          { path: '/complete-profile', element: <h1>Complete profile</h1> },
        ],
      },
      { path: '/sign-in', element: <h1>Sign in page</h1> },
    ],
    { initialEntries: [initialEntry] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useSession.setState({ status: 'loading', accessToken: null, refreshToken: null, userId: null });
});

afterEach(() => vi.unstubAllGlobals());

describe('RequireAuth', () => {
  it('redirects signed-out visitors to sign-in', async () => {
    renderGuarded('signedOut');
    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
    expect(screen.queryByText('Private home')).not.toBeInTheDocument();
  });

  it('renders protected content for a signed-in visitor', async () => {
    renderGuarded('signedIn');
    expect(await screen.findByText('Private home')).toBeInTheDocument();
  });

  it('redirects an incomplete profile to complete-profile', async () => {
    renderGuarded('signedIn', false);
    expect(await screen.findByText('Complete profile')).toBeInTheDocument();
    expect(screen.queryByText('Private home')).not.toBeInTheDocument();
  });

  it('keeps complete-profile available for an incomplete signed-in profile', async () => {
    renderGuarded('signedIn', false, '/complete-profile');
    expect(await screen.findByText('Complete profile')).toBeInTheDocument();
  });
});
