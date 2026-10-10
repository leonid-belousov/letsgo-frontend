import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityPage, BookingsPage, ChatPage, NotificationsPage, PaymentsPage } from './pages';

afterEach(() => vi.unstubAllGlobals());

function renderPage(element: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('inbox routes', () => {
  it('renders the conversation list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                {
                  id: 'conversation-1',
                  kind: 'DIRECT',
                  eventId: null,
                  clubId: null,
                  tournamentId: null,
                  counterpart: { id: 'user-2', nickname: 'Ada', username: 'ada', avatarId: null },
                  lastMessage: { body: 'Hello', sender: null, kind: 'TEXT' },
                  unreadCount: 2,
                  capabilities: { canRead: true, canPost: true },
                },
              ],
              nextCursor: null,
            }),
            { status: 200 },
          ),
      ),
    );
    renderPage(<ChatPage />);
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();
  });

  it('opens a conversation and sends a message with an idempotency key', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/chat/conversations' && (init?.method ?? 'GET') === 'GET') {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'conversation-1',
                kind: 'DIRECT',
                eventId: null,
                clubId: null,
                tournamentId: null,
                counterpart: { id: 'user-2', nickname: 'Ada', username: 'ada', avatarId: null },
                lastMessage: null,
                unreadCount: 0,
                capabilities: { canRead: true, canPost: true },
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        );
      }
      if (url.pathname.endsWith('/v1/chat/conversations/conversation-1/read')) {
        expect(init?.method).toBe('POST');
        return new Response(null, { status: 204 });
      }
      if (url.pathname.includes('/v1/chat/conversations/conversation-1/messages')) {
        if (init?.method === 'POST') {
          expect(init.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
          expect(JSON.parse(String(init.body))).toEqual({ body: 'Hi Ada' });
          return new Response(JSON.stringify({ id: 'message-1', body: 'Hi Ada' }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            items: [{ id: 'message-0', body: 'Hello', kind: 'TEXT', sender: null }],
            nextCursor: null,
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage(<ChatPage />);

    await user.click(await screen.findByRole('button', { name: 'Open conversation' }));
    expect(await screen.findByText('Hello')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Message'), 'Hi Ada');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await screen.findByText('Hello');
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) => String(input).endsWith('/messages') && init?.method === 'POST',
      ),
    ).toBe(true);
  });

  it('renders activity items without interpreting their payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                {
                  id: 'activity-1',
                  kind: 'invitation.received',
                  actor: { id: 'user-2', nickname: 'Ada', username: 'ada', avatarId: null },
                  objectType: 'GAME',
                  objectId: 'game-1',
                  payload: { title: 'Friday game' },
                  createdAt: '2030-01-01T00:00:00Z',
                  readAt: null,
                },
              ],
              nextCursor: null,
            }),
            { status: 200 },
          ),
      ),
    );
    renderPage(<ActivityPage />);
    expect(await screen.findByText('invitation.received')).toBeInTheDocument();
    expect(screen.getByText(/Ada · 2030-01-01/)).toBeInTheDocument();
  });

  it('enables only server-authorized cash payment actions', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/me/payments') {
        return new Response(
          JSON.stringify([
            {
              id: 'obligation-1',
              kind: 'PITCH_RENTAL',
              amountMinor: 1000,
              paidMinor: 0,
              remainingMinor: 1000,
              refundDueMinor: 0,
              refundedMinor: 0,
              currency: 'UZS',
              status: 'OPEN',
              capabilities: {
                canPayCash: true,
                canConfirmCash: true,
                canCorrect: false,
                canPayOnline: false,
              },
            },
          ]),
          { status: 200 },
        );
      }
      if (url.pathname.endsWith('/pay-cash')) {
        expect(init?.method).toBe('POST');
        return new Response(JSON.stringify({ id: 'obligation-1' }), { status: 200 });
      }
      if (url.pathname.endsWith('/cash-received')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
        expect(JSON.parse(String(init?.body))).toEqual({ amountMinor: 1000 });
        return new Response(JSON.stringify({ id: 'obligation-1' }), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage(<PaymentsPage />);

    await user.click(await screen.findByRole('button', { name: 'Pay cash' }));
    await user.type(screen.getByLabelText('Cash received for obligation-1'), '1000');
    await user.click(screen.getByRole('button', { name: 'Confirm cash' }));

    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/pay-cash'))).toBe(
        true,
      );
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/cash-received'))).toBe(
        true,
      );
    });
  });

  it('lists bookings, loads another page, and cancels a booking', async () => {
    const user = userEvent.setup();
    let mineCalls = 0;
    const booking = {
      id: 'booking-1',
      pitchId: 'pitch-1',
      venueId: 'venue-1',
      configurationId: 'whole',
      configurationName: 'Whole pitch',
      source: 'LETSGO',
      status: 'REQUESTED',
      pitchBooked: false,
      startsAt: '2030-01-01T10:00:00Z',
      endsAt: '2030-01-01T11:00:00Z',
      holdExpiresAt: null,
      priceMinor: 1000,
      currency: 'UZS',
      rulesVersion: 1,
      termsVersion: null,
      termsAcceptedAt: null,
      confirmationSource: null,
      cancelReason: null,
      bookedById: 'user-1',
      version: 1,
      createdAt: '2030-01-01T09:00:00Z',
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/bookings/mine') {
        mineCalls += 1;
        return new Response(
          JSON.stringify({
            items: mineCalls === 1 ? [booking] : [{ ...booking, id: 'booking-2' }],
            nextCursor: mineCalls === 1 ? 'cursor-1' : null,
          }),
          { status: 200 },
        );
      }
      if (url.pathname.endsWith('/cancel')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
        expect(JSON.parse(String(init?.body))).toEqual({ reason: 'Cancelled by user' });
        return new Response(JSON.stringify({ ...booking, status: 'CANCELLED' }), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    renderPage(<BookingsPage />);

    expect(await screen.findByText('Whole pitch')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await vi.waitFor(() => expect(screen.getAllByText('Whole pitch')).toHaveLength(2));
    await user.click(screen.getAllByRole('button', { name: 'Cancel booking' })[0]!);
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/cancel'))).toBe(true);
    });
  });

  it('lists notifications and marks an unread item read', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/notifications') {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'notification-1',
                category: 'booking',
                title: 'Booking request',
                body: 'A new booking needs attention.',
                objectType: 'BOOKING',
                objectId: 'booking-1',
                createdAt: '2030-01-01T00:00:00Z',
                readAt: null,
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        );
      }
      if (url.pathname === '/v1/notifications/preferences' && (init?.method ?? 'GET') === 'GET') {
        return new Response(JSON.stringify([{ category: 'booking', inApp: true, push: false }]), {
          status: 200,
        });
      }
      if (url.pathname === '/v1/notifications/preferences' && init?.method === 'PUT') {
        expect(JSON.parse(String(init?.body))).toEqual({
          category: 'booking',
          inApp: true,
          push: true,
        });
        return new Response(JSON.stringify({ category: 'booking', inApp: true, push: true }), {
          status: 200,
        });
      }
      if (url.pathname === '/v1/notifications/read') {
        expect(init?.method).toBe('POST');
        expect(JSON.parse(String(init?.body))).toEqual({ ids: ['notification-1'] });
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage(<NotificationsPage />);

    expect(await screen.findByText('Booking request')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mark read' }));
    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).endsWith('/notifications/read')),
      ).toBe(true),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Push' }));
    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).endsWith('/notifications/preferences') && init?.method === 'PUT',
        ),
      ).toBe(true),
    );
  });

  it('renders payment obligations from the owner endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                id: 'obligation-1',
                kind: 'PITCH_RENTAL',
                amountMinor: 1000,
                paidMinor: 0,
                remainingMinor: 1000,
                refundDueMinor: 0,
                refundedMinor: 0,
                currency: 'UZS',
                status: 'OPEN',
                capabilities: {
                  canPayCash: false,
                  canConfirmCash: false,
                  canCorrect: false,
                  canPayOnline: false,
                },
              },
            ]),
            { status: 200 },
          ),
      ),
    );
    renderPage(<PaymentsPage />);
    expect(await screen.findByText('PITCH RENTAL')).toBeInTheDocument();
    expect(screen.getByText('Remaining: 1000 UZS · OPEN')).toBeInTheDocument();
  });
});
