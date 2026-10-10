import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateClubPage, CreateTournamentPage } from './pages';

afterEach(() => vi.unstubAllGlobals());

function renderCreate(path: string, element: React.ReactNode, destination: string, label: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path={destination} element={<div>{label}</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('create entity routes', () => {
  it('creates a club with the typed payload and idempotency key', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toMatch(/\/v1\/clubs$/);
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        name: 'Tashkent United',
        username: 'tashkent-united',
        city: 'Tashkent',
        visibility: 'PUBLIC',
        joinMode: 'APPROVE_REQUESTS',
      });
      return new Response(JSON.stringify({ id: 'club-created' }), { status: 201 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderCreate('/clubs/new', <CreateClubPage />, '/clubs/club-created', 'created club');
    await user.type(screen.getByLabelText(/Club name/), 'Tashkent United');
    await user.type(screen.getByLabelText(/Username/), 'Tashkent-United');
    await user.type(screen.getByLabelText(/City/), 'Tashkent');
    await user.click(screen.getByRole('button', { name: 'Create club' }));

    expect(await screen.findByText('created club')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates a tournament with dates and fee policy', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toMatch(/\/v1\/tournaments$/);
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        name: 'Autumn Cup',
        city: 'Tashkent',
        startsOn: '2030-10-01',
        formatPlayers: 5,
        feeMode: 'FREE',
        isPublic: true,
      });
      return new Response(JSON.stringify({ id: 'tournament-created' }), { status: 201 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderCreate(
      '/tournaments/new',
      <CreateTournamentPage />,
      '/tournaments/tournament-created',
      'created tournament',
    );
    await user.type(screen.getByLabelText(/^Name/), 'Autumn Cup');
    await user.type(screen.getByLabelText(/^City/), 'Tashkent');
    fireEvent.change(screen.getByLabelText(/Starts on/), { target: { value: '2030-10-01' } });
    await user.click(screen.getByRole('button', { name: 'Create tournament' }));

    expect(await screen.findByText('created tournament')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
