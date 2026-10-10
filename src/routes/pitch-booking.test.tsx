import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookPitchPage, PitchDetailsPage } from './pages';

afterEach(() => vi.unstubAllGlobals());

const pitch = {
  id: 'pitch-1',
  venueId: 'venue-1',
  name: 'Pitch A',
  surface: 'NATURAL',
  setting: 'OUTDOOR',
  lengthM: null,
  widthM: null,
  formats: ['5v5'],
  amenities: ['SHOWERS'],
  pricePerHourMinor: 5000,
  currency: 'UZS',
  status: 'PUBLISHED',
  bookable: true,
  parts: [{ id: 'part-1', name: 'Whole pitch', sortOrder: 0 }],
  configurations: [{ id: 'config-1', name: 'Whole pitch', format: '5v5', partIds: ['part-1'] }],
  bookingRules: {
    minDurationMinutes: 60,
    gridMinutes: 30,
    allowHalfHourExtension: true,
    stepMinutes: 30,
    openingHours: null,
    ruleVersion: 1,
  },
  latestTerms: {
    version: 2,
    body: 'Cancel 24 hours before start.',
    createdAt: '2030-01-01T00:00:00Z',
  },
  capabilities: { canEdit: false, canPublish: false, canManageBookings: false },
};

describe('pitch and booking routes', () => {
  it('renders pitch details and exposes the booking route', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(pitch), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/pitches/pitch-1']}>
          <Routes>
            <Route path="/pitches/:pitchId" element={<PitchDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Pitch A' })).toBeInTheDocument();
    expect(screen.getByText('Amenities: SHOWERS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book this pitch' })).toHaveAttribute(
      'href',
      '/bookings/new?pitchId=pitch-1',
    );
  });

  it('requests a booking with the pitch configuration and accepted terms version', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v1/pitches/pitch-1')) {
        return new Response(JSON.stringify(pitch), { status: 200 });
      }
      if (url.endsWith('/v1/bookings')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
        expect(JSON.parse(String(init?.body))).toMatchObject({
          pitchId: 'pitch-1',
          configurationId: 'config-1',
          durationMinutes: 60,
          termsVersion: 2,
        });
        return new Response(
          JSON.stringify({ id: 'booking-1', pitchId: 'pitch-1', status: 'REQUESTED' }),
          {
            status: 201,
          },
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/bookings/new?pitchId=pitch-1']}>
          <Routes>
            <Route path="/bookings/new" element={<BookPitchPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText('Configuration: Whole pitch');
    fireEvent.change(screen.getByLabelText(/Starts/), { target: { value: '2030-01-01T18:00' } });
    await user.click(screen.getByRole('button', { name: 'Request booking' }));

    await waitFor(() =>
      expect(screen.getByText(/Booking booking-1 was submitted/)).toBeInTheDocument(),
    );
  });

  it('lets a pitch manager decide a booking request', async () => {
    const user = userEvent.setup();
    const managerPitch = {
      ...pitch,
      capabilities: { ...pitch.capabilities, canManageBookings: true },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v1/pitches/pitch-1')) {
        return new Response(JSON.stringify(managerPitch), { status: 200 });
      }
      if (url.includes('/v1/pitches/pitch-1/bookings?')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'booking-1',
                pitchId: 'pitch-1',
                venueId: 'venue-1',
                configurationId: 'config-1',
                configurationName: 'Whole pitch',
                source: 'LETSGO',
                status: 'REQUESTED',
                pitchBooked: false,
                startsAt: '2030-01-01T18:00:00Z',
                endsAt: '2030-01-01T19:00:00Z',
                holdExpiresAt: null,
                priceMinor: 5000,
                currency: 'UZS',
                rulesVersion: 1,
                termsVersion: 2,
                termsAcceptedAt: '2030-01-01T17:00:00Z',
                confirmationSource: null,
                cancelReason: null,
                bookedById: 'user-1',
                version: 1,
                createdAt: '2030-01-01T17:00:00Z',
                isExternal: false,
                booker: { userId: 'user-1', nickname: 'Ada', username: 'ada' },
                externalName: null,
                externalPhone: null,
                staffNote: null,
                confirmedById: null,
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        );
      }
      if (url.includes('/v1/pitches/pitch-1/calendar')) {
        return new Response(
          JSON.stringify({ pitchId: 'pitch-1', timezone: 'Asia/Tbilisi', entries: [] }),
          { status: 200 },
        );
      }
      if (url.endsWith('/v1/bookings/booking-1/confirm')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
        return new Response(JSON.stringify({ id: 'booking-1', status: 'CONFIRMED' }), {
          status: 200,
        });
      }
      if (url.endsWith('/v1/pitches/pitch-1/bookings/external')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) });
        expect(JSON.parse(String(init?.body))).toMatchObject({
          configurationId: 'config-1',
          externalName: 'Walk-in team',
          durationMinutes: 60,
        });
        return new Response(JSON.stringify({ id: 'external-1', status: 'CONFIRMED' }), {
          status: 201,
        });
      }
      if (url.endsWith('/v1/pitches/pitch-1/blocks')) {
        expect(init?.method).toBe('POST');
        expect(JSON.parse(String(init?.body))).toMatchObject({
          configurationId: 'config-1',
          durationMinutes: 60,
          reason: 'Maintenance',
        });
        return new Response(JSON.stringify({ id: 'block-1' }), { status: 201 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/pitches/pitch-1']}>
          <Routes>
            <Route path="/pitches/:pitchId" element={<PitchDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/confirm'))).toBe(true),
    );
    await user.type(screen.getByLabelText(/Name or team/), 'Walk-in team');
    fireEvent.change(screen.getAllByLabelText(/Starts/)[0]!, {
      target: { value: '2030-01-01T18:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Add external booking' }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).endsWith('/bookings/external')),
      ).toBe(true),
    );
    fireEvent.change(screen.getAllByLabelText(/Starts/)[1]!, {
      target: { value: '2030-01-01T20:00' },
    });
    await user.type(screen.getByLabelText('Reason (optional)'), 'Maintenance');
    await user.click(screen.getByRole('button', { name: 'Block time' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/blocks'))).toBe(true),
    );
  });
});
