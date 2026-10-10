import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '@/stores/session';
import { ClubDetailsPage, DiscoveryPage, TournamentDetailsPage, VenueDetailsPage } from './pages';

beforeEach(() => {
  useSession.setState({
    status: 'signedIn',
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    userId: 'user-1',
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('discovery route', () => {
  it('loads typed club, venue, and tournament cards and searches clubs and venues', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/clubs') {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'club-1',
                entityType: 'CLUB',
                name: 'Tashkent United',
                username: 'tashkent-united',
                city: 'Tashkent',
                logoMediaId: null,
                visibility: 'PUBLIC',
                memberCount: 12,
                joinMode: 'OPEN',
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        );
      }
      if (url.pathname === '/v1/venues') {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'venue-1',
                name: 'Central pitch',
                nameLocal: null,
                kind: 'COMMUNITY',
                status: 'PUBLISHED',
                city: 'Tashkent',
                district: null,
                address: null,
                latitude: null,
                longitude: null,
                timezone: 'Asia/Tashkent',
                about: null,
                photoMediaIds: [],
                pitchCount: 2,
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        );
      }
      if (url.pathname === '/v1/tournaments') {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'tournament-1',
                name: 'Autumn Cup',
                logoMediaId: null,
                city: 'Tashkent',
                timezone: 'Asia/Tashkent',
                duration: 'ONE_DAY',
                startsOn: '2030-10-01',
                endsOn: null,
                formatPlayers: 5,
                ageBand: 'NONE',
                feeMode: 'FREE',
                feeMinor: 0,
                currency: 'UZS',
                status: 'REGISTRATION_OPEN',
                label: 'REGISTRATION_OPEN',
                acceptedClubs: 2,
                maxClubs: 8,
                openSpots: 6,
                isPublic: true,
                mainSponsor: null,
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscoveryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Tashkent United')).toBeInTheDocument();
    expect(screen.getByText('Central pitch')).toBeInTheDocument();
    expect(screen.getByText('Autumn Cup')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search clubs and venues'), 'United');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes('/v1/clubs?limit=8&q=United'),
        ),
      ).toBe(true);
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes('/v1/venues?limit=8&q=United'),
        ),
      ).toBe(true);
    });
  });

  it('sends an idempotent join request from a club detail page', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/clubs/club-1' && (init?.method ?? 'GET') === 'GET') {
        return new Response(
          JSON.stringify({
            id: 'club-1',
            entityType: 'CLUB',
            name: 'Tashkent United',
            username: 'tashkent-united',
            city: 'Tashkent',
            logoMediaId: null,
            visibility: 'PUBLIC',
            status: 'ACTIVE',
            restricted: false,
            about: 'Community club',
            memberCount: 12,
            myMembership: null,
            capabilities: {
              canJoin: true,
              canRequestToJoin: false,
              canCancelRequest: false,
              canAcceptInvitation: false,
              canEdit: false,
              canInvite: false,
              canApprove: false,
              canRemoveMembers: false,
              canManageRoles: false,
              canManageAwards: false,
              canTransferOwnership: false,
              canArchive: false,
              canLeave: false,
            },
          }),
          { status: 200 },
        );
      }
      if (url.pathname === '/v1/clubs/club-1/join') {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
        return new Response(JSON.stringify({ status: 'MEMBER' }), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/clubs/club-1']}>
          <Routes>
            <Route path="/clubs/:clubId" element={<ClubDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'Join club' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/clubs/club-1/join'),
        expect.anything(),
      ),
    );
  });

  it('renders tournament and venue details from their typed endpoints', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path === '/v1/tournaments/tournament-1') {
        return new Response(
          JSON.stringify({
            id: 'tournament-1',
            name: 'Autumn Cup',
            city: 'Tashkent',
            startsOn: '2030-10-01',
            endsOn: null,
            formatPlayers: 5,
            feeMinor: 0,
            currency: 'UZS',
            label: 'REGISTRATION_OPEN',
            acceptedClubs: 2,
            maxClubs: 8,
            description: null,
          }),
          { status: 200 },
        );
      }
      if (path === '/v1/venues/venue-1') {
        return new Response(
          JSON.stringify({
            id: 'venue-1',
            name: 'Central pitch',
            city: 'Tashkent',
            address: 'Main street',
            kind: 'COMMUNITY',
            about: null,
            pitches: [
              {
                id: 'pitch-1',
                name: 'Pitch A',
                surface: 'NATURAL',
                setting: 'OUTDOOR',
                bookable: true,
              },
            ],
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tournaments/tournament-1']}>
          <Routes>
            <Route path="/tournaments/:tournamentId" element={<TournamentDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Autumn Cup')).toBeInTheDocument();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/venues/venue-1']}>
          <Routes>
            <Route path="/venues/:venueId" element={<VenueDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Pitch A')).toBeInTheDocument();
  });
});
