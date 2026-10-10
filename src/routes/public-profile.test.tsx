import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicProfilePage } from './pages';

afterEach(() => vi.unstubAllGlobals());

describe('public profile route', () => {
  it('renders only fields allowed by the viewer-aware response', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/v1/users/user-1');
      return new Response(
        JSON.stringify({
          id: 'user-1',
          nickname: 'Player One',
          username: 'player-one',
          avatarId: null,
          visibility: 'PUBLIC',
          city: 'Tashkent',
          bio: 'Forward',
          age: 28,
          followStatus: null,
          capabilities: {
            canFollow: true,
            canUnfollow: false,
            canMessage: true,
            canFavourite: true,
            canBlock: true,
            canReport: true,
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/people/user-1']}>
          <Routes>
            <Route path="/people/:userId" element={<PublicProfilePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Player One' })).toBeInTheDocument();
    expect(screen.getByText('City: Tashkent')).toBeInTheDocument();
    expect(screen.getByText('Age: 28')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
