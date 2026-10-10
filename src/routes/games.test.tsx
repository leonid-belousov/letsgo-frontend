import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameDetailsPage, GamesFeed } from '@/features/games/pages';
import { CreateGamePage } from './pages';
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

describe('game route', () => {
  it('loads a game and sends an idempotent join request', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v1/games/game-1')) {
        return new Response(
          JSON.stringify({
            id: 'game-1',
            title: 'Friday five-a-side',
            startsAt: '2030-01-01T18:00:00.000Z',
            formatPlayers: 5,
            venue: { id: 'venue-1', name: 'Central pitch' },
            pitch: null,
            seats: { spotsLeft: 4, capacity: 10, confirmed: 6, waitlisted: 0 },
            priceMinor: 2500,
            currency: 'GEL',
            notes: null,
            viewer: { participation: null },
            capabilities: {
              canJoin: true,
              canRequestToJoin: false,
              canLeave: false,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/v1/games/game-1/join')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
        return new Response(JSON.stringify({ id: 'participation-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/games/game-1']}>
          <Routes>
            <Route path="/games/:gameId" element={<GameDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Friday five-a-side' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Join game' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/games/game-1/join'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});

describe('games feed', () => {
  it('applies supported filters without coupling the city and sort', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ items: [], nextCursor: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 41.3, longitude: 69.2 } } as GeolocationPosition),
      },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GamesFeed city="Tashkent" />
      </QueryClientProvider>,
    );

    await user.clear(screen.getByLabelText('City'));
    await user.type(screen.getByLabelText('City'), 'Samarkand');
    await user.selectOptions(screen.getByLabelText('Sort'), 'PRICE_LOW_HIGH');
    await user.type(screen.getByLabelText('Surfaces'), 'ARTIFICIAL,NATURAL');
    await user.type(screen.getByLabelText('Settings'), 'INDOOR');
    await user.type(screen.getByLabelText('Amenities'), 'SHOWERS');
    await user.type(screen.getByLabelText('Minimum duration (minutes)'), '60');
    await user.type(screen.getByLabelText('Maximum duration (minutes)'), '90');
    await user.type(screen.getByLabelText('Minimum organiser rating'), '4');
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await user.type(screen.getByLabelText('Radius (km)'), '5');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      const request = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
      expect(request.pathname).toBe('/v1/games');
      expect(Object.fromEntries(request.searchParams)).toMatchObject({
        limit: '20',
        availability: 'OPEN_OR_WAITLIST',
        city: 'Samarkand',
        sort: 'PRICE_LOW_HIGH',
        surfaces: 'ARTIFICIAL,NATURAL',
        settings: 'INDOOR',
        amenities: 'SHOWERS',
        durationMinMinutes: '60',
        durationMaxMinutes: '90',
        minOrganiserRating: '4',
        radiusKm: '5',
        lat: '41.3',
        lng: '69.2',
      });
    });
  });

  it('resets filters while preserving city and sort', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [], nextCursor: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <GamesFeed city="Tashkent" />
      </QueryClientProvider>,
    );

    await user.selectOptions(screen.getByLabelText('Sort'), 'PRICE_LOW_HIGH');
    await user.type(screen.getByLabelText('Surfaces'), 'ARTIFICIAL');
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(screen.getByLabelText('City')).toHaveValue('Tashkent');
    expect(screen.getByLabelText('Sort')).toHaveValue('PRICE_LOW_HIGH');
    expect(screen.getByLabelText('Surfaces')).toHaveValue('');
  });
});

describe('create game route', () => {
  it('posts the contract payload with an idempotency key and opens the game', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v1/games')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
        expect(JSON.parse(String(init?.body))).toMatchObject({
          kind: 'CASUAL',
          formatPlayers: 5,
          teamCount: 2,
          joinMode: 'APPROVE_REQUESTS',
          publish: true,
        });
        return new Response(JSON.stringify({ id: 'game-created' }), { status: 201 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/games/new']}>
          <Routes>
            <Route path="/games/new" element={<CreateGamePage />} />
            <Route path="/games/:gameId" element={<div>created game</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2030-01-01T18:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2030-01-01T19:00' } });
    await user.click(screen.getByLabelText('Publish immediately'));
    await user.click(screen.getByRole('button', { name: 'Create game' }));

    expect(await screen.findByText('created game')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/games'), expect.anything());
  });
});
