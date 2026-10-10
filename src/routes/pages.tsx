import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '@/api/client';
import { ApiRequestError, userMessageFor } from '@/api/errors';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, TextField } from '@/design/ui';
import { ME_KEY, useMe } from '@/features/auth/hooks';
import type { components } from '@/api/schema';
import { t } from '@/i18n';
import { useHealth } from '@/api/health';
import { paths } from './routes';
import { GamesFeed } from '@/features/games/pages';
import { useSession } from '@/stores/session';

export function HomePage() {
  const health = useHealth();
  const me = useMe();
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <h1>{t('app.title')}</h1>
      <Card>
        <strong>API status</strong>
        {health.isPending ? (
          <LoadingState label="Checking API" />
        ) : health.isError ? (
          <ErrorState
            title={
              health.error instanceof ApiRequestError
                ? userMessageFor(health.error.code)
                : userMessageFor('UNKNOWN')
            }
            onRetry={() => void health.refetch()}
          />
        ) : (
          <p>
            <Badge tone="pitch-booked">connected</Badge> uptime {health.data.uptimeSeconds}s
          </p>
        )}
      </Card>
      <GamesFeed city={me.data?.city ?? undefined} />
    </div>
  );
}

type CreateGameDraft = {
  kind: 'CASUAL' | 'CLUB_V_CLUB' | 'TRAINING';
  title: string;
  startsAt: string;
  endsAt: string;
  formatPlayers: string;
  priceMinor: string;
  currency: string;
  joinMode: 'AUTO_ACCEPT' | 'APPROVE_REQUESTS';
  ageBand: 'NONE' | 'A35' | 'A40' | 'A45' | 'A50';
  notes: string;
  publish: boolean;
};

export function CreateGamePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CreateGameDraft>({
    kind: 'CASUAL',
    title: '',
    startsAt: '',
    endsAt: '',
    formatPlayers: '5',
    priceMinor: '0',
    currency: 'GEL',
    joinMode: 'APPROVE_REQUESTS',
    ageBand: 'NONE',
    notes: '',
    publish: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({
    mutationFn: () => {
      const body: components['schemas']['CreateGameDto'] = {
        kind: draft.kind,
        title: draft.title.trim() || undefined,
        startsAt: new Date(draft.startsAt).toISOString(),
        endsAt: new Date(draft.endsAt).toISOString(),
        formatPlayers: Number(draft.formatPlayers),
        teamCount: 2,
        substitutesPerTeam: 0,
        priceMinor: Number(draft.priceMinor),
        currency: draft.currency.trim().toUpperCase(),
        joinMode: draft.joinMode,
        ageBand: draft.ageBand,
        allowYounger: false,
        waitlistEnabled: true,
        autoNextWave: true,
        payCashEnabled: true,
        notes: draft.notes.trim() || undefined,
        publish: draft.publish,
      };
      return apiRequest<components['schemas']['GameDto']>('/v1/games', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body,
      });
    },
    onSuccess: (game) => navigate(paths.game(game.id)),
  });
  const update =
    (field: keyof CreateGameDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((current) => ({ ...current, [field]: event.target.value }));
  const valid = draft.startsAt && draft.endsAt && new Date(draft.endsAt) > new Date(draft.startsAt);
  return (
    <main className="lg-shell__main">
      <Card>
        <h1>Create game</h1>
        <p>Set the schedule and participation rules. Venue and pitch can be added later.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
            if (valid) mutation.mutate();
          }}
          noValidate
        >
          <div className="lg-field">
            <label className="lg-field__label" htmlFor="game-kind">
              Game type
            </label>
            <select
              id="game-kind"
              className="lg-input"
              value={draft.kind}
              onChange={update('kind')}
            >
              <option value="CASUAL">Casual</option>
              <option value="CLUB_V_CLUB">Club vs club</option>
              <option value="TRAINING">Training</option>
            </select>
          </div>
          <TextField label="Title" value={draft.title} onChange={update('title')} />
          <TextField
            label="Starts"
            type="datetime-local"
            value={draft.startsAt}
            onChange={update('startsAt')}
            error={submitted && !draft.startsAt ? 'Start time is required' : undefined}
          />
          <TextField
            label="Ends"
            type="datetime-local"
            value={draft.endsAt}
            onChange={update('endsAt')}
            error={
              submitted && !draft.endsAt
                ? 'End time is required'
                : submitted && !valid
                  ? 'End must be after start'
                  : undefined
            }
          />
          <TextField
            label="Players per team"
            type="number"
            min="1"
            value={draft.formatPlayers}
            onChange={update('formatPlayers')}
          />
          <TextField
            label="Price (minor units)"
            type="number"
            min="0"
            value={draft.priceMinor}
            onChange={update('priceMinor')}
          />
          <TextField label="Currency" value={draft.currency} onChange={update('currency')} />
          <div className="lg-field">
            <label className="lg-field__label" htmlFor="game-join-mode">
              Join mode
            </label>
            <select
              id="game-join-mode"
              className="lg-input"
              value={draft.joinMode}
              onChange={update('joinMode')}
            >
              <option value="APPROVE_REQUESTS">Approve requests</option>
              <option value="AUTO_ACCEPT">Auto accept</option>
            </select>
          </div>
          <div className="lg-field">
            <label className="lg-field__label" htmlFor="game-age-band">
              Age band
            </label>
            <select
              id="game-age-band"
              className="lg-input"
              value={draft.ageBand}
              onChange={update('ageBand')}
            >
              <option value="NONE">All ages</option>
              <option value="A35">35+</option>
              <option value="A40">40+</option>
              <option value="A45">45+</option>
              <option value="A50">50+</option>
            </select>
          </div>
          <TextField label="Notes" value={draft.notes} onChange={update('notes')} />
          <label className="lg-field__label">
            <input
              type="checkbox"
              checked={draft.publish}
              onChange={(event) =>
                setDraft((current) => ({ ...current, publish: event.target.checked }))
              }
            />{' '}
            Publish immediately
          </label>
          {mutation.isError ? <p role="alert">Could not create the game.</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create game'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

type CreateClubDraft = {
  name: string;
  username: string;
  city: string;
  about: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  joinMode: 'OPEN' | 'APPROVE_REQUESTS' | 'INVITE_ONLY';
};

export function CreateClubPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CreateClubDraft>({
    name: '',
    username: '',
    city: '',
    about: '',
    visibility: 'PUBLIC',
    joinMode: 'APPROVE_REQUESTS',
  });
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<components['schemas']['ClubDto']>('/v1/clubs', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: {
          name: draft.name.trim(),
          username: draft.username.trim().toLowerCase(),
          city: draft.city.trim(),
          about: draft.about.trim() || undefined,
          visibility: draft.visibility,
          joinMode: draft.joinMode,
        } satisfies components['schemas']['CreateClubDto'],
      }),
    onSuccess: (club) => navigate(paths.club(club.id)),
  });
  const update =
    (field: keyof CreateClubDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((current) => ({ ...current, [field]: event.target.value }));
  const required = !draft.name.trim() || !draft.username.trim() || !draft.city.trim();
  return (
    <main className="lg-shell__main">
      <Card>
        <h1>Create club</h1>
        <p>Set up a club profile and choose how new members join.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
            if (!required) mutation.mutate();
          }}
          noValidate
        >
          <TextField
            label="Club name"
            requiredMark
            value={draft.name}
            onChange={update('name')}
            error={submitted && !draft.name.trim() ? 'Club name is required' : undefined}
          />
          <TextField
            label="Username"
            requiredMark
            value={draft.username}
            onChange={update('username')}
            error={submitted && !draft.username.trim() ? 'Username is required' : undefined}
          />
          <TextField
            label="City"
            requiredMark
            value={draft.city}
            onChange={update('city')}
            error={submitted && !draft.city.trim() ? 'City is required' : undefined}
          />
          <TextField label="About" value={draft.about} onChange={update('about')} />
          <div className="lg-field">
            <label className="lg-field__label" htmlFor="club-visibility">
              Visibility
            </label>
            <select
              id="club-visibility"
              className="lg-input"
              value={draft.visibility}
              onChange={update('visibility')}
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>
          <div className="lg-field">
            <label className="lg-field__label" htmlFor="club-join-mode">
              Join mode
            </label>
            <select
              id="club-join-mode"
              className="lg-input"
              value={draft.joinMode}
              onChange={update('joinMode')}
            >
              <option value="APPROVE_REQUESTS">Approve requests</option>
              <option value="OPEN">Open</option>
              <option value="INVITE_ONLY">Invite only</option>
            </select>
          </div>
          {mutation.isError ? <p role="alert">Could not create the club.</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create club'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

type CreateTournamentDraft = {
  name: string;
  description: string;
  city: string;
  timezone: string;
  duration: 'ONE_DAY' | 'MULTI_DAY' | 'SEASON';
  startsOn: string;
  endsOn: string;
  formatPlayers: string;
  ageBand: 'NONE' | 'A35' | 'A40' | 'A45' | 'A50';
  feeMode: 'FREE' | 'PER_CLUB' | 'PER_PLAYER';
  feeMinor: string;
  currency: string;
  minClubs: string;
  maxClubs: string;
  isPublic: boolean;
  waitlistOpen: boolean;
};

export function CreateTournamentPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CreateTournamentDraft>({
    name: '',
    description: '',
    city: '',
    timezone: 'Asia/Tashkent',
    duration: 'ONE_DAY',
    startsOn: '',
    endsOn: '',
    formatPlayers: '5',
    ageBand: 'NONE',
    feeMode: 'FREE',
    feeMinor: '0',
    currency: 'UZS',
    minClubs: '2',
    maxClubs: '8',
    isPublic: true,
    waitlistOpen: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<components['schemas']['TournamentDto']>('/v1/tournaments', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: {
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          city: draft.city.trim(),
          timezone: draft.timezone.trim(),
          duration: draft.duration,
          startsOn: draft.startsOn,
          endsOn: draft.endsOn || undefined,
          formatPlayers: Number(draft.formatPlayers),
          ageBand: draft.ageBand,
          feeMode: draft.feeMode,
          feeMinor: Number(draft.feeMinor),
          currency: draft.currency.trim().toUpperCase(),
          minClubs: draft.minClubs ? Number(draft.minClubs) : undefined,
          maxClubs: draft.maxClubs ? Number(draft.maxClubs) : undefined,
          isPublic: draft.isPublic,
          waitlistOpen: draft.waitlistOpen,
        } satisfies components['schemas']['CreateTournamentDto'],
      }),
    onSuccess: (tournament) => navigate(paths.tournament(tournament.id)),
  });
  const update =
    (field: keyof CreateTournamentDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((current) => ({ ...current, [field]: event.target.value }));
  const required = !draft.name.trim() || !draft.city.trim() || !draft.startsOn;
  return (
    <main className="lg-shell__main">
      <Card>
        <h1>Create tournament</h1>
        <p>Publish the tournament basics; scheduling and fixtures can follow.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
            if (!required) mutation.mutate();
          }}
          noValidate
        >
          <TextField
            label="Name"
            requiredMark
            value={draft.name}
            onChange={update('name')}
            error={submitted && !draft.name.trim() ? 'Name is required' : undefined}
          />
          <TextField
            label="Description"
            value={draft.description}
            onChange={update('description')}
          />
          <TextField
            label="City"
            requiredMark
            value={draft.city}
            onChange={update('city')}
            error={submitted && !draft.city.trim() ? 'City is required' : undefined}
          />
          <TextField
            label="Timezone"
            requiredMark
            value={draft.timezone}
            onChange={update('timezone')}
          />
          <div className="lg-field">
            <label className="lg-field__label" htmlFor="tournament-duration">
              Duration
            </label>
            <select
              id="tournament-duration"
              className="lg-input"
              value={draft.duration}
              onChange={update('duration')}
            >
              <option value="ONE_DAY">One day</option>
              <option value="MULTI_DAY">Multi-day</option>
              <option value="SEASON">Season</option>
            </select>
          </div>
          <TextField
            label="Starts on"
            requiredMark
            type="date"
            value={draft.startsOn}
            onChange={update('startsOn')}
            error={submitted && !draft.startsOn ? 'Start date is required' : undefined}
          />
          <TextField label="Ends on" type="date" value={draft.endsOn} onChange={update('endsOn')} />
          <TextField
            label="Players per side"
            type="number"
            min="1"
            value={draft.formatPlayers}
            onChange={update('formatPlayers')}
          />
          <div className="lg-field">
            <label className="lg-field__label" htmlFor="tournament-fee-mode">
              Fee mode
            </label>
            <select
              id="tournament-fee-mode"
              className="lg-input"
              value={draft.feeMode}
              onChange={update('feeMode')}
            >
              <option value="FREE">Free</option>
              <option value="PER_CLUB">Per club</option>
              <option value="PER_PLAYER">Per player</option>
            </select>
          </div>
          <TextField
            label="Fee (minor units)"
            type="number"
            min="0"
            value={draft.feeMinor}
            onChange={update('feeMinor')}
          />
          <TextField label="Currency" value={draft.currency} onChange={update('currency')} />
          <TextField
            label="Minimum clubs"
            type="number"
            min="1"
            value={draft.minClubs}
            onChange={update('minClubs')}
          />
          <TextField
            label="Maximum clubs"
            type="number"
            min="1"
            value={draft.maxClubs}
            onChange={update('maxClubs')}
          />
          <label className="lg-field__label">
            <input
              type="checkbox"
              checked={draft.isPublic}
              onChange={(event) =>
                setDraft((current) => ({ ...current, isPublic: event.target.checked }))
              }
            />{' '}
            Public tournament
          </label>
          <label className="lg-field__label">
            <input
              type="checkbox"
              checked={draft.waitlistOpen}
              onChange={(event) =>
                setDraft((current) => ({ ...current, waitlistOpen: event.target.checked }))
              }
            />{' '}
            Open waitlist
          </label>
          {mutation.isError ? <p role="alert">Could not create the tournament.</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create tournament'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

type ClubSearchPage = components['schemas']['ClubSearchPageDto'];
type TournamentPage = components['schemas']['TournamentPageDto'];
type VenuePage = components['schemas']['VenuePageDto'];

export function DiscoveryPage() {
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const queryString = query ? `&q=${encodeURIComponent(query)}` : '';
  const clubs = useQuery({
    queryKey: ['discovery', 'clubs', query],
    queryFn: () => apiRequest<ClubSearchPage>(`/v1/clubs?limit=8${queryString}`),
    retry: false,
  });
  const tournaments = useQuery({
    queryKey: ['discovery', 'tournaments'],
    queryFn: () => apiRequest<TournamentPage>('/v1/tournaments?limit=8&when=UPCOMING'),
    retry: false,
  });
  const venues = useQuery({
    queryKey: ['discovery', 'venues', query],
    queryFn: () => apiRequest<VenuePage>(`/v1/venues?limit=8${queryString}`),
    retry: false,
  });
  const retry = () => {
    void clubs.refetch();
    void tournaments.refetch();
    void venues.refetch();
  };

  if (clubs.isPending || tournaments.isPending || venues.isPending) {
    return <LoadingState label="Loading discovery" />;
  }
  if (clubs.isError || tournaments.isError || venues.isError) {
    const error = clubs.error ?? tournaments.error ?? venues.error;
    return (
      <ErrorState
        title={error instanceof ApiRequestError ? userMessageFor(error.code) : undefined}
        onRetry={retry}
      />
    );
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Card>
        <h1>Discovery</h1>
        <p>Find clubs, venues, and upcoming tournaments.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(draftQuery.trim());
          }}
        >
          <TextField
            label="Search clubs and venues"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </Card>
      <DiscoverySection title="Clubs" empty="No clubs found.">
        {clubs.data?.items.map((club) => (
          <Link to={paths.club(club.id)} key={club.id}>
            <strong>{club.name}</strong>
            <span>
              {club.city} · {club.memberCount ?? 0} members
            </span>
          </Link>
        ))}
      </DiscoverySection>
      <DiscoverySection title="Venues" empty="No venues found.">
        {venues.data?.items.map((venue) => (
          <Link to={paths.venue(venue.id)} key={venue.id}>
            <strong>{venue.name}</strong>
            <span>
              {venue.city} · {venue.kind === 'PAID' ? 'Paid' : 'Community'} · {venue.pitchCount}{' '}
              pitches
            </span>
          </Link>
        ))}
      </DiscoverySection>
      <DiscoverySection title="Upcoming tournaments" empty="No upcoming tournaments found.">
        {tournaments.data?.items.map((tournament) => (
          <Link to={paths.tournament(tournament.id)} key={tournament.id}>
            <strong>{tournament.name}</strong>
            <span>
              {tournament.city} · {tournament.startsOn} · {tournament.label.replaceAll('_', ' ')}
            </span>
          </Link>
        ))}
      </DiscoverySection>
    </div>
  );
}

export function ClubDetailsPage() {
  const { clubId } = useParams();
  const queryClient = useQueryClient();
  const club = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => apiRequest<components['schemas']['ClubDto']>(`/v1/clubs/${clubId}`),
    enabled: Boolean(clubId),
    retry: false,
  });
  const membershipMutation = useMutation({
    mutationFn: (action: 'join' | 'cancel' | 'leave') =>
      apiRequest<components['schemas']['MembershipResultDto']>(
        `/v1/clubs/${clubId}/${action === 'join' ? 'join' : action === 'cancel' ? 'join/cancel' : 'leave'}`,
        { method: 'POST', idempotencyKey: crypto.randomUUID() },
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['club', clubId] }),
  });

  if (!clubId || club.isPending) return <LoadingState label="Loading club" />;
  if (club.isError || !club.data) {
    return (
      <ErrorState
        title={club.error instanceof ApiRequestError ? userMessageFor(club.error.code) : undefined}
        onRetry={() => void club.refetch()}
      />
    );
  }
  const { capabilities, myMembership } = club.data;
  const action = capabilities.canJoin
    ? 'join'
    : capabilities.canRequestToJoin
      ? 'join'
      : capabilities.canCancelRequest
        ? 'cancel'
        : capabilities.canLeave
          ? 'leave'
          : null;
  const label = capabilities.canJoin
    ? 'Join club'
    : capabilities.canRequestToJoin
      ? 'Request to join'
      : capabilities.canCancelRequest
        ? 'Cancel request'
        : capabilities.canLeave
          ? 'Leave club'
          : null;
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Card>
        <h1>{club.data.name}</h1>
        <p>
          @{club.data.username} · {club.data.city} · {club.data.memberCount ?? 0} members
        </p>
        {club.data.about ? <p>{club.data.about}</p> : null}
        {myMembership ? <Badge>{myMembership.status}</Badge> : null}
        {label && action ? (
          <Button
            disabled={membershipMutation.isPending}
            onClick={() => membershipMutation.mutate(action)}
          >
            {membershipMutation.isPending ? 'Working…' : label}
          </Button>
        ) : null}
        {membershipMutation.isError ? <p role="alert">Could not update membership.</p> : null}
      </Card>
    </div>
  );
}

export function PublicProfilePage() {
  const { userId } = useParams();
  const profile = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => apiRequest<components['schemas']['PublicProfileDto']>(`/v1/users/${userId}`),
    enabled: Boolean(userId),
    retry: false,
  });
  if (!userId || profile.isPending) return <LoadingState label="Loading profile" />;
  if (profile.isError || !profile.data) {
    return (
      <ErrorState
        title={
          profile.error instanceof ApiRequestError ? userMessageFor(profile.error.code) : undefined
        }
        onRetry={() => void profile.refetch()}
      />
    );
  }
  const item = profile.data;
  return (
    <main className="lg-shell__main">
      <Card>
        <h1>{item.nickname ?? item.username ?? 'Player'}</h1>
        {item.username ? <p>@{item.username}</p> : null}
        <p>{item.visibility === 'PRIVATE' ? 'Private profile' : 'Public profile'}</p>
        {item.city ? <p>City: {item.city}</p> : null}
        {item.age !== undefined ? <p>Age: {item.age}</p> : null}
        {item.bio ? <p>{item.bio}</p> : null}
        {item.followStatus ? <Badge>{item.followStatus}</Badge> : null}
      </Card>
    </main>
  );
}

export function TournamentDetailsPage() {
  const { tournamentId } = useParams();
  const tournament = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () =>
      apiRequest<components['schemas']['TournamentDto']>(`/v1/tournaments/${tournamentId}`),
    enabled: Boolean(tournamentId),
    retry: false,
  });
  if (!tournamentId || tournament.isPending) return <LoadingState label="Loading tournament" />;
  if (tournament.isError || !tournament.data) {
    return (
      <ErrorState
        title={
          tournament.error instanceof ApiRequestError
            ? userMessageFor(tournament.error.code)
            : undefined
        }
        onRetry={() => void tournament.refetch()}
      />
    );
  }
  const item = tournament.data;
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Card>
        <h1>{item.name}</h1>
        <p>
          {item.city} · {item.startsOn}
          {item.endsOn ? ` – ${item.endsOn}` : ''}
        </p>
        <Badge>{item.label.replaceAll('_', ' ')}</Badge>
        {item.description ? <p>{item.description}</p> : null}
        <p>
          {item.formatPlayers}v{item.formatPlayers} · {item.acceptedClubs} accepted clubs
          {item.maxClubs !== null ? ` of ${item.maxClubs}` : ''}
        </p>
        <p>
          Fee: {item.feeMinor} {item.currency}
        </p>
      </Card>
    </div>
  );
}

export function VenueDetailsPage() {
  const { venueId } = useParams();
  const venue = useQuery({
    queryKey: ['venue', venueId],
    queryFn: () => apiRequest<components['schemas']['VenueDetailDto']>(`/v1/venues/${venueId}`),
    enabled: Boolean(venueId),
    retry: false,
  });
  if (!venueId || venue.isPending) return <LoadingState label="Loading venue" />;
  if (venue.isError || !venue.data) {
    return (
      <ErrorState
        title={
          venue.error instanceof ApiRequestError ? userMessageFor(venue.error.code) : undefined
        }
        onRetry={() => void venue.refetch()}
      />
    );
  }
  const item = venue.data;
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Card>
        <h1>{item.name}</h1>
        <p>
          {item.city}
          {item.address ? ` · ${item.address}` : ''} · {item.kind === 'PAID' ? 'Paid' : 'Community'}
        </p>
        {item.about ? <p>{item.about}</p> : null}
      </Card>
      <Card>
        <h2>Pitches</h2>
        {item.pitches.length ? (
          <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
            {item.pitches.map((pitch) => (
              <div key={pitch.id}>
                <strong>{pitch.name}</strong>
                <p>
                  {pitch.surface ?? 'Surface not set'} · {pitch.setting ?? 'Setting not set'} ·{' '}
                  {pitch.bookable ? 'Bookable' : 'Not bookable'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No published pitches yet.</p>
        )}
      </Card>
    </div>
  );
}

export function PitchDetailsPage() {
  const { pitchId } = useParams();
  const pitch = useQuery({
    queryKey: ['pitch', pitchId],
    queryFn: () => apiRequest<components['schemas']['PitchDto']>(`/v1/pitches/${pitchId}`),
    enabled: Boolean(pitchId),
    retry: false,
  });
  if (!pitchId || pitch.isPending) return <LoadingState label="Loading pitch" />;
  if (pitch.isError || !pitch.data) {
    return (
      <ErrorState
        title={
          pitch.error instanceof ApiRequestError ? userMessageFor(pitch.error.code) : undefined
        }
        onRetry={() => void pitch.refetch()}
      />
    );
  }
  const item = pitch.data;
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Card>
        <h1>{item.name}</h1>
        <p>
          {item.surface ?? 'Surface not set'} · {item.setting ?? 'Setting not set'} ·{' '}
          {item.bookable ? 'Bookable' : 'Not bookable'}
        </p>
        <p>Formats: {item.formats.length ? item.formats.join(', ') : 'Not set'}</p>
        {item.amenities.length ? <p>Amenities: {item.amenities.join(', ')}</p> : null}
        {item.pricePerHourMinor !== null ? (
          <p>
            Price per hour: {item.pricePerHourMinor} {item.currency}
          </p>
        ) : null}
        {item.bookable && item.configurations[0] ? (
          <Link
            to={`${paths.bookPitch}?pitchId=${encodeURIComponent(item.id)}`}
            className="lg-button lg-button--primary"
          >
            Book this pitch
          </Link>
        ) : null}
      </Card>
      {item.latestTerms ? (
        <Card>
          <h2>Booking terms v{item.latestTerms.version}</h2>
          <p>{item.latestTerms.body}</p>
        </Card>
      ) : null}
      {item.capabilities.canManageBookings ? (
        <>
          <PitchStaffBookings pitchId={item.id} />
          <PitchManagerTools pitch={item} />
        </>
      ) : null}
    </div>
  );
}

function PitchStaffBookings({ pitchId }: { pitchId: string }) {
  const queryClient = useQueryClient();
  const bookings = useInfiniteQuery({
    queryKey: ['pitch-bookings', pitchId],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<components['schemas']['StaffBookingPageDto']>(
        `/v1/pitches/${pitchId}/bookings?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
  const command = useMutation({
    mutationFn: ({
      id,
      type,
    }: {
      id: string;
      type: 'confirm' | 'reject' | 'hold' | 'complete';
    }) => {
      const path = `/v1/bookings/${id}/${type}`;
      const body =
        type === 'reject'
          ? { reason: 'Rejected by venue' }
          : type === 'hold'
            ? { holdMinutes: 30 }
            : undefined;
      return apiRequest<components['schemas']['StaffBookingDto']>(path, {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        ...(body ? { body } : {}),
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['pitch-bookings', pitchId] }),
  });
  if (bookings.isPending) return <LoadingState label="Loading booking requests" />;
  if (bookings.isError) {
    return (
      <ErrorState
        title={
          bookings.error instanceof ApiRequestError
            ? userMessageFor(bookings.error.code)
            : undefined
        }
        onRetry={() => void bookings.refetch()}
      />
    );
  }
  const items = bookings.data.pages.flatMap((page) => page.items);
  return (
    <Card>
      <h2>Booking requests</h2>
      {items.length ? (
        <div style={{ display: 'grid', gap: 'var(--lg-space-3)' }}>
          {items.map((booking) => {
            const booker =
              booking.externalName ??
              booking.booker?.nickname ??
              booking.booker?.username ??
              'Let’sGo player';
            return (
              <div key={booking.id}>
                <strong>{booker}</strong>
                <p>
                  {booking.startsAt} → {booking.endsAt} · {booking.status}
                </p>
                {booking.status === 'REQUESTED' ? (
                  <>
                    <Button
                      disabled={command.isPending}
                      onClick={() => command.mutate({ id: booking.id, type: 'confirm' })}
                    >
                      Confirm
                    </Button>{' '}
                    <Button
                      variant="secondary"
                      disabled={command.isPending}
                      onClick={() => command.mutate({ id: booking.id, type: 'hold' })}
                    >
                      Hold
                    </Button>{' '}
                    <Button
                      variant="secondary"
                      disabled={command.isPending}
                      onClick={() => command.mutate({ id: booking.id, type: 'reject' })}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {booking.status === 'HELD' ? (
                  <>
                    <Button
                      disabled={command.isPending}
                      onClick={() => command.mutate({ id: booking.id, type: 'confirm' })}
                    >
                      Confirm
                    </Button>{' '}
                    <Button
                      variant="secondary"
                      disabled={command.isPending}
                      onClick={() => command.mutate({ id: booking.id, type: 'reject' })}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {booking.status === 'CONFIRMED' ? (
                  <Button
                    variant="secondary"
                    disabled={command.isPending}
                    onClick={() => command.mutate({ id: booking.id, type: 'complete' })}
                  >
                    Complete
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p>No booking requests.</p>
      )}
      {bookings.hasNextPage ? (
        <Button
          variant="secondary"
          disabled={bookings.isFetchingNextPage}
          onClick={() => void bookings.fetchNextPage()}
        >
          {bookings.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </Card>
  );
}

function PitchManagerTools({ pitch }: { pitch: components['schemas']['PitchDto'] }) {
  const queryClient = useQueryClient();
  const [range] = useState(() => {
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return { from: from.toISOString(), to: to.toISOString() };
  });
  const calendar = useQuery({
    queryKey: ['pitch-calendar', pitch.id, range.from, range.to],
    queryFn: () =>
      apiRequest<components['schemas']['CalendarDto']>(
        `/v1/pitches/${pitch.id}/calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      ),
    retry: false,
  });
  const [externalName, setExternalName] = useState('');
  const [externalPhone, setExternalPhone] = useState('');
  const [externalNote, setExternalNote] = useState('');
  const [externalStartsAt, setExternalStartsAt] = useState('');
  const [externalDuration, setExternalDuration] = useState('60');
  const [blockStartsAt, setBlockStartsAt] = useState('');
  const [blockDuration, setBlockDuration] = useState('60');
  const [blockReason, setBlockReason] = useState('');
  const configurationId = pitch.configurations[0]?.id;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['pitch-calendar', pitch.id] });
    void queryClient.invalidateQueries({ queryKey: ['pitch-bookings', pitch.id] });
  };
  const external = useMutation({
    mutationFn: () =>
      apiRequest<components['schemas']['StaffBookingDto']>(
        `/v1/pitches/${pitch.id}/bookings/external`,
        {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
          body: {
            configurationId: configurationId ?? '',
            startsAt: new Date(externalStartsAt).toISOString(),
            durationMinutes: Number(externalDuration),
            externalName: externalName.trim(),
            externalPhone: externalPhone.trim() || undefined,
            staffNote: externalNote.trim() || undefined,
          } satisfies components['schemas']['CreateExternalBookingDto'],
        },
      ),
    onSuccess: () => {
      setExternalName('');
      setExternalPhone('');
      setExternalNote('');
      setExternalStartsAt('');
      refresh();
    },
  });
  const block = useMutation({
    mutationFn: () =>
      apiRequest<components['schemas']['BlockDto']>(`/v1/pitches/${pitch.id}/blocks`, {
        method: 'POST',
        body: {
          configurationId,
          startsAt: new Date(blockStartsAt).toISOString(),
          durationMinutes: Number(blockDuration),
          reason: blockReason.trim() || undefined,
        } satisfies components['schemas']['CreateBlockDto'],
      }),
    onSuccess: () => {
      setBlockStartsAt('');
      setBlockReason('');
      refresh();
    },
  });
  const cancelBlock = useMutation({
    mutationFn: (id: string) =>
      apiRequest<components['schemas']['BlockDto']>(`/v1/pitches/${pitch.id}/blocks/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: refresh,
  });
  return (
    <>
      <Card>
        <h2>Pitch calendar</h2>
        {calendar.isPending ? <LoadingState label="Loading pitch calendar" /> : null}
        {calendar.isError ? (
          <ErrorState
            title={
              calendar.error instanceof ApiRequestError
                ? userMessageFor(calendar.error.code)
                : undefined
            }
            onRetry={() => void calendar.refetch()}
          />
        ) : null}
        {calendar.data?.entries.length ? (
          <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
            {calendar.data.entries.map((entry) => (
              <div key={entry.id}>
                <strong>{entry.kind === 'BLOCK' ? 'Blocked' : (entry.title ?? 'Booking')}</strong>
                <p>
                  {entry.startsAt} → {entry.endsAt}
                  {entry.status ? ` · ${entry.status}` : ''}
                </p>
                {entry.kind === 'BLOCK' ? (
                  <Button
                    variant="secondary"
                    disabled={cancelBlock.isPending}
                    onClick={() => {
                      if (window.confirm('Remove this block?')) cancelBlock.mutate(entry.id);
                    }}
                  >
                    Remove block
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : calendar.data ? (
          <p>No entries in the next seven days.</p>
        ) : null}
      </Card>
      <Card>
        <h2>Add external booking</h2>
        <TextField
          label="Name or team"
          requiredMark
          value={externalName}
          onChange={(event) => setExternalName(event.target.value)}
        />
        <TextField
          label="Starts"
          requiredMark
          type="datetime-local"
          value={externalStartsAt}
          onChange={(event) => setExternalStartsAt(event.target.value)}
        />
        <TextField
          label="Duration (minutes)"
          type="number"
          min={pitch.bookingRules?.minDurationMinutes ?? 30}
          step={pitch.bookingRules?.gridMinutes ?? 30}
          value={externalDuration}
          onChange={(event) => setExternalDuration(event.target.value)}
        />
        <TextField
          label="Phone (optional)"
          value={externalPhone}
          onChange={(event) => setExternalPhone(event.target.value)}
        />
        <TextField
          label="Staff note (optional)"
          value={externalNote}
          onChange={(event) => setExternalNote(event.target.value)}
        />
        <Button
          disabled={
            external.isPending || !configurationId || !externalName.trim() || !externalStartsAt
          }
          onClick={() => external.mutate()}
        >
          {external.isPending ? 'Saving…' : 'Add external booking'}
        </Button>
      </Card>
      <Card>
        <h2>Block pitch time</h2>
        <TextField
          label="Starts"
          requiredMark
          type="datetime-local"
          value={blockStartsAt}
          onChange={(event) => setBlockStartsAt(event.target.value)}
        />
        <TextField
          label="Duration (minutes)"
          type="number"
          min={30}
          step={pitch.bookingRules?.gridMinutes ?? 30}
          value={blockDuration}
          onChange={(event) => setBlockDuration(event.target.value)}
        />
        <TextField
          label="Reason (optional)"
          value={blockReason}
          onChange={(event) => setBlockReason(event.target.value)}
        />
        <Button
          variant="secondary"
          disabled={block.isPending || !blockStartsAt}
          onClick={() => block.mutate()}
        >
          {block.isPending ? 'Saving…' : 'Block time'}
        </Button>
      </Card>
    </>
  );
}

export function BookPitchPage() {
  const [searchParams] = useSearchParams();
  const [draftPitchId, setDraftPitchId] = useState(searchParams.get('pitchId') ?? '');
  const [selectedPitchId, setSelectedPitchId] = useState(searchParams.get('pitchId') ?? '');
  const [startsAt, setStartsAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [submitted, setSubmitted] = useState(false);
  const [created, setCreated] = useState<components['schemas']['BookingDto'] | null>(null);
  const pitch = useQuery({
    queryKey: ['book-pitch', selectedPitchId],
    queryFn: () => apiRequest<components['schemas']['PitchDto']>(`/v1/pitches/${selectedPitchId}`),
    enabled: Boolean(selectedPitchId),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<components['schemas']['BookingDto']>('/v1/bookings', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: {
          pitchId: selectedPitchId,
          configurationId: pitch.data?.configurations[0]?.id ?? '',
          startsAt: new Date(startsAt).toISOString(),
          durationMinutes: Number(durationMinutes),
          termsVersion: pitch.data?.latestTerms?.version,
        } satisfies components['schemas']['CreateBookingDto'],
      }),
    onSuccess: setCreated,
  });
  const canSubmit = Boolean(selectedPitchId && pitch.data?.configurations[0] && startsAt);
  if (created) {
    return (
      <Card>
        <h1>Booking requested</h1>
        <p>
          Booking {created.id} was submitted with status {created.status}.
        </p>
        <Link to={paths.pitch(created.pitchId)} className="lg-button lg-button--secondary">
          Back to pitch
        </Link>
        <Link to={paths.bookings} className="lg-button lg-button--secondary">
          My bookings
        </Link>
      </Card>
    );
  }
  return (
    <main className="lg-shell__main">
      <Card>
        <h1>Book pitch</h1>
        <p>Choose a pitch, configuration, start time, and duration.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
            if (canSubmit) mutation.mutate();
          }}
          noValidate
        >
          <TextField
            label="Pitch id"
            requiredMark
            value={draftPitchId}
            onChange={(event) => setDraftPitchId(event.target.value)}
            onBlur={() => setSelectedPitchId(draftPitchId.trim())}
            error={submitted && !selectedPitchId ? 'Pitch id is required' : undefined}
          />
          {pitch.isPending ? <LoadingState label="Loading pitch terms" /> : null}
          {pitch.isError ? <p role="alert">Could not load this pitch.</p> : null}
          {pitch.data ? (
            <p>
              Configuration: {pitch.data.configurations[0]?.name ?? 'No bookable configuration'}
            </p>
          ) : null}
          <TextField
            label="Starts"
            requiredMark
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            error={submitted && !startsAt ? 'Start time is required' : undefined}
          />
          <TextField
            label="Duration (minutes)"
            requiredMark
            type="number"
            min={pitch.data?.bookingRules?.minDurationMinutes ?? 30}
            step={pitch.data?.bookingRules?.gridMinutes ?? 30}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
          />
          {mutation.isError ? <p role="alert">Could not request this booking.</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Requesting…' : 'Request booking'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

export function BookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<components['schemas']['BookingDto']['status'] | ''>('');
  const bookings = useInfiniteQuery({
    queryKey: ['bookings', status],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (status) params.set('status', status);
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<components['schemas']['BookingPageDto']>(
        `/v1/bookings/mine?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      apiRequest<components['schemas']['BookingDto']>(`/v1/bookings/${id}/cancel`, {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { reason: 'Cancelled by user' } satisfies components['schemas']['BookingReasonDto'],
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
  if (bookings.isPending) return <LoadingState label="Loading bookings" />;
  if (bookings.isError) {
    return (
      <ErrorState
        title={
          bookings.error instanceof ApiRequestError
            ? userMessageFor(bookings.error.code)
            : undefined
        }
        onRetry={() => void bookings.refetch()}
      />
    );
  }
  const items = bookings.data.pages.flatMap((page) => page.items);
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Card>
        <h1>My bookings</h1>
        <label className="lg-field__label" htmlFor="booking-status">
          Status
        </label>
        <select
          id="booking-status"
          className="lg-input"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as components['schemas']['BookingDto']['status'] | '')
          }
        >
          <option value="">All statuses</option>
          {(['REQUESTED', 'HELD', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const).map(
            (value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ),
          )}
        </select>
      </Card>
      {items.length ? (
        <Card>
          <div style={{ display: 'grid', gap: 'var(--lg-space-3)' }}>
            {items.map((booking) => (
              <div key={booking.id}>
                <strong>{booking.configurationName}</strong>
                <p>
                  {booking.startsAt} → {booking.endsAt}
                </p>
                <p>
                  {booking.status} · {booking.pitchBooked ? 'Pitch booked' : 'Awaiting decision'}
                  {booking.priceMinor !== null
                    ? ` · ${booking.priceMinor} ${booking.currency}`
                    : ''}
                </p>
                {['REQUESTED', 'HELD', 'CONFIRMED'].includes(booking.status) ? (
                  <Button
                    variant="secondary"
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (window.confirm('Cancel this booking?')) cancel.mutate(booking.id);
                    }}
                  >
                    Cancel booking
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {bookings.hasNextPage ? (
            <Button
              variant="secondary"
              disabled={bookings.isFetchingNextPage}
              onClick={() => void bookings.fetchNextPage()}
            >
              {bookings.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
        </Card>
      ) : (
        <EmptyState title="No bookings" body="Your pitch booking requests will appear here." />
      )}
    </div>
  );
}

function DiscoverySection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <Card>
      <h2>{title}</h2>
      {hasItems ? (
        <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>{children}</div>
      ) : (
        <p>{empty}</p>
      )}
    </Card>
  );
}

type ProfileDraft = {
  nickname: string;
  username: string;
  dateOfBirth: string;
  city: string;
  bio: string;
};

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const [submitted, setSubmitted] = useState(false);
  const [editedDraft, setEditedDraft] = useState<ProfileDraft | null>(null);
  const mutation = useMutation({
    mutationFn: (body: ProfileDraft & { version?: number }) =>
      apiRequest('/v1/me/profile', { method: 'PATCH', body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      navigate(paths.home, { replace: true });
    },
  });
  if (me.isPending) return <LoadingState label="Loading profile" />;
  if (me.isError) {
    return (
      <ErrorState
        title={me.error instanceof ApiRequestError ? userMessageFor(me.error.code) : undefined}
        onRetry={() => void me.refetch()}
      />
    );
  }
  if (!me.data) return <LoadingState label="Loading profile" />;
  const draft: ProfileDraft = editedDraft ?? {
    nickname: me.data.nickname ?? '',
    username: me.data.username ?? '',
    dateOfBirth: me.data.dateOfBirth ?? '',
    city: me.data.city ?? '',
    bio: me.data.bio ?? '',
  };
  const fieldError = (value: string, label: string) =>
    submitted && !value.trim() ? `${label} is required` : undefined;
  const update = (field: keyof ProfileDraft) => (event: ChangeEvent<HTMLInputElement>) =>
    setEditedDraft((current) => ({ ...(current ?? draft), [field]: event.target.value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (
      !draft.nickname.trim() ||
      !draft.username.trim() ||
      !draft.dateOfBirth ||
      !draft.city.trim()
    )
      return;
    mutation.mutate({ ...draft, version: me.data?.version });
  };
  return (
    <main className="lg-shell__main">
      <Card>
        <h1>{t('profile.complete')}</h1>
        <p>{t('profile.completeBody')}</p>
        <form onSubmit={submit} noValidate>
          <TextField
            label={t('profile.nickname')}
            requiredMark
            value={draft.nickname}
            onChange={update('nickname')}
            error={fieldError(draft.nickname, t('profile.nickname'))}
          />
          <TextField
            label={t('profile.username')}
            requiredMark
            value={draft.username}
            onChange={update('username')}
            error={fieldError(draft.username, t('profile.username'))}
          />
          <TextField
            label={t('profile.dateOfBirth')}
            requiredMark
            type="date"
            value={draft.dateOfBirth}
            onChange={update('dateOfBirth')}
            error={fieldError(draft.dateOfBirth, t('profile.dateOfBirth'))}
          />
          <TextField
            label={t('profile.city')}
            requiredMark
            value={draft.city}
            onChange={update('city')}
            error={fieldError(draft.city, t('profile.city'))}
          />
          <TextField label={t('profile.bio')} value={draft.bio} onChange={update('bio')} />
          {mutation.isError ? (
            <p role="alert">
              {mutation.error instanceof ApiRequestError
                ? userMessageFor(mutation.error.code)
                : userMessageFor('UNKNOWN')}
            </p>
          ) : null}
          <Button type="submit" disabled={mutation.isPending}>
            {t('profile.continue')}
          </Button>
        </form>
      </Card>
    </main>
  );
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const mutation = useMutation({
    mutationFn: (body: ProfileDraft & { version?: number }) =>
      apiRequest<components['schemas']['OwnerProfileDto']>('/v1/me/profile', {
        method: 'PATCH',
        body,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(ME_KEY, updated);
      setDraft(null);
    },
  });

  if (me.isPending) return <LoadingState label="Loading profile" />;
  if (me.isError) {
    return (
      <ErrorState
        title={me.error instanceof ApiRequestError ? userMessageFor(me.error.code) : undefined}
        onRetry={() => void me.refetch()}
      />
    );
  }
  if (!me.data) return <LoadingState label="Loading profile" />;
  const values = draft ?? {
    nickname: me.data.nickname ?? '',
    username: me.data.username ?? '',
    dateOfBirth: me.data.dateOfBirth ?? '',
    city: me.data.city ?? '',
    bio: me.data.bio ?? '',
  };
  const update = (field: keyof ProfileDraft) => (event: ChangeEvent<HTMLInputElement>) =>
    setDraft((current) => ({ ...(current ?? values), [field]: event.target.value }));

  return (
    <main className="lg-shell__main">
      <Card>
        <h1>My profile</h1>
        <p>Keep the details other players use to recognise you.</p>
        <p>
          <Link to={paths.bookings}>My bookings</Link> ·{' '}
          <Link to={paths.payments}>My payments</Link> ·{' '}
          <Link to={paths.notifications}>Notifications</Link>
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ ...values, version: me.data.version });
          }}
        >
          <TextField
            label={t('profile.nickname')}
            value={values.nickname}
            onChange={update('nickname')}
          />
          <TextField
            label={t('profile.username')}
            value={values.username}
            onChange={update('username')}
          />
          <TextField
            label={t('profile.dateOfBirth')}
            type="date"
            value={values.dateOfBirth}
            onChange={update('dateOfBirth')}
          />
          <TextField label={t('profile.city')} value={values.city} onChange={update('city')} />
          <TextField label={t('profile.bio')} value={values.bio} onChange={update('bio')} />
          {mutation.isError ? (
            <p role="alert">
              {mutation.error instanceof ApiRequestError
                ? userMessageFor(mutation.error.code)
                : userMessageFor('UNKNOWN')}
            </p>
          ) : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

type Privacy = components['schemas']['PrivacyDto'];
type PrivacyKey = keyof Privacy;

const privacySelects: { key: PrivacyKey; label: string; options: readonly string[] }[] = [
  { key: 'profileVisibility', label: 'Profile visibility', options: ['PUBLIC', 'PRIVATE'] },
  { key: 'postsAudience', label: 'Posts', options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'] },
  { key: 'historyAudience', label: 'Game history', options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'] },
  { key: 'statsAudience', label: 'Stats', options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'] },
  { key: 'awardsAudience', label: 'Awards', options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'] },
  { key: 'clubsAudience', label: 'Clubs', options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'] },
  { key: 'ratingsAudience', label: 'Ratings', options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'] },
  { key: 'cityAudience', label: 'City', options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'] },
  { key: 'ageAudience', label: 'Age', options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'] },
  {
    key: 'followListAudience',
    label: 'Follow list',
    options: ['EVERYONE', 'FOLLOWERS', 'ONLY_ME'],
  },
  { key: 'messagePolicy', label: 'Messages', options: ['EVERYONE', 'FOLLOWING', 'NOBODY'] },
  {
    key: 'invitationPolicy',
    label: 'Invitations',
    options: ['EVERYONE', 'FOLLOWING', 'CLUB_MEMBERS', 'NOBODY'],
  },
  { key: 'mentionPolicy', label: 'Mentions', options: ['EVERYONE', 'FOLLOWING', 'NOBODY'] },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const session = useSession();
  const privacy = useQuery({
    queryKey: ['privacy'],
    queryFn: () => apiRequest<Privacy>('/v1/me/privacy'),
    retry: false,
  });
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiRequest<components['schemas']['SessionDto'][]>('/v1/auth/sessions'),
    retry: false,
  });
  const [draft, setDraft] = useState<Privacy | null>(null);
  const privacyMutation = useMutation({
    mutationFn: (body: Privacy) => apiRequest<Privacy>('/v1/me/privacy', { method: 'PATCH', body }),
    onSuccess: (updated) => {
      setDraft(updated);
      queryClient.setQueryData(['privacy'], updated);
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/v1/auth/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  if (privacy.isPending || sessions.isPending) return <LoadingState label="Loading settings" />;
  if (privacy.isError || sessions.isError) {
    const error = privacy.error ?? sessions.error;
    return (
      <ErrorState
        title={error instanceof ApiRequestError ? userMessageFor(error.code) : undefined}
        onRetry={() => {
          void privacy.refetch();
          void sessions.refetch();
        }}
      />
    );
  }
  if (!privacy.data || !sessions.data) return <LoadingState label="Loading settings" />;
  const values = draft ?? privacy.data;
  const update = <K extends PrivacyKey>(key: K, value: Privacy[K]) =>
    setDraft((current) => ({ ...(current ?? values), [key]: value }));

  return (
    <main className="lg-shell__main" style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Card>
        <h1>Settings</h1>
        <p>Choose who can see your profile and contact you.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            privacyMutation.mutate(values);
          }}
        >
          {privacySelects.map(({ key, label, options }) => (
            <div className="lg-field" key={key}>
              <label className="lg-field__label" htmlFor={`privacy-${key}`}>
                {label}
              </label>
              <select
                id={`privacy-${key}`}
                className="lg-input"
                value={String(values[key])}
                onChange={(event) => update(key, event.target.value as Privacy[typeof key])}
              >
                {options.map((option) => (
                  <option value={option} key={option}>
                    {option.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <label className="lg-field__label">
            <input
              type="checkbox"
              checked={values.reviewTags}
              onChange={(event) => update('reviewTags', event.target.checked)}
            />{' '}
            Review tags before they appear
          </label>
          <label className="lg-field__label">
            <input
              type="checkbox"
              checked={values.externalMediaSharing}
              onChange={(event) => update('externalMediaSharing', event.target.checked)}
            />{' '}
            Allow external media sharing
          </label>
          {privacyMutation.isError ? <p role="alert">Could not save privacy settings.</p> : null}
          {privacyMutation.isSuccess ? <p role="status">Privacy settings saved.</p> : null}
          <Button type="submit" disabled={privacyMutation.isPending}>
            {privacyMutation.isPending ? 'Saving…' : 'Save privacy settings'}
          </Button>
        </form>
      </Card>
      <Card>
        <h2>Active sessions</h2>
        <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
          {sessions.data.map((item) => (
            <div key={item.id}>
              <strong>{item.deviceName ?? 'Unnamed device'}</strong>{' '}
              {item.current ? <Badge tone="pitch-booked">Current</Badge> : null}
              <p>Last used {item.lastUsedAt.slice(0, 10)}</p>
              {!item.current ? (
                <Button
                  variant="secondary"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(item.id)}
                >
                  Revoke session
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={() => void session.signOut()}>
          Sign out
        </Button>
      </Card>
    </main>
  );
}

export function ChatPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const conversations = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () =>
      apiRequest<components['schemas']['ConversationPageDto']>('/v1/chat/conversations?limit=20'),
    retry: false,
  });
  const messages = useQuery({
    queryKey: ['chat-messages', selectedId],
    queryFn: () =>
      apiRequest<components['schemas']['MessagePageDto']>(
        `/v1/chat/conversations/${selectedId}/messages?limit=50`,
      ),
    enabled: Boolean(selectedId),
    retry: false,
  });
  const readMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/v1/chat/conversations/${id}/read`, { method: 'POST' }),
  });
  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest<components['schemas']['MessageDto']>(
        `/v1/chat/conversations/${selectedId}/messages`,
        {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
          body: { body: messageBody.trim() } satisfies components['schemas']['SendMessageDto'],
        },
      ),
    onSuccess: async () => {
      setMessageBody('');
      await messages.refetch();
      await conversations.refetch();
    },
  });
  if (conversations.isPending) return <LoadingState label="Loading conversations" />;
  if (conversations.isError) {
    return (
      <ErrorState
        title={
          conversations.error instanceof ApiRequestError
            ? userMessageFor(conversations.error.code)
            : undefined
        }
        onRetry={() => void conversations.refetch()}
      />
    );
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Card>
        <h1>Chat</h1>
        {conversations.data.items.length ? (
          <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
            {conversations.data.items.map((conversation) => (
              <div key={conversation.id}>
                <strong>
                  {conversation.counterpart?.nickname ??
                    conversation.counterpart?.username ??
                    conversation.kind}
                </strong>
                <p>{conversation.lastMessage?.body ?? 'No messages yet.'}</p>
                {conversation.unreadCount ? (
                  <Badge>{conversation.unreadCount} unread</Badge>
                ) : null}{' '}
                {conversation.capabilities.canRead ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedId(conversation.id);
                      readMutation.mutate(conversation.id);
                    }}
                  >
                    {selectedId === conversation.id ? 'Opened' : 'Open conversation'}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p>No conversations yet.</p>
        )}
      </Card>
      {selectedId ? (
        <Card>
          <h2>Conversation</h2>
          {messages.isPending ? <LoadingState label="Loading messages" /> : null}
          {messages.isError ? <p role="alert">Could not load messages.</p> : null}
          {messages.data?.items.length ? (
            <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
              {messages.data.items.map((message) => (
                <p key={message.id}>{message.body ?? 'System card'}</p>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (messageBody.trim()) sendMutation.mutate();
            }}
          >
            <TextField
              label="Message"
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
            />
            {sendMutation.isError ? <p role="alert">Could not send message.</p> : null}
            <Button type="submit" disabled={sendMutation.isPending || !messageBody.trim()}>
              {sendMutation.isPending ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

export function ActivityPage() {
  const activity = useQuery({
    queryKey: ['activity'],
    queryFn: () => apiRequest<components['schemas']['ActivityPageDto']>('/v1/activity?limit=20'),
    retry: false,
  });
  if (activity.isPending) return <LoadingState label="Loading activity" />;
  if (activity.isError) {
    return (
      <ErrorState
        title={
          activity.error instanceof ApiRequestError
            ? userMessageFor(activity.error.code)
            : undefined
        }
        onRetry={() => void activity.refetch()}
      />
    );
  }
  return (
    <Card>
      <h1>Activity</h1>
      {activity.data.items.length ? (
        <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
          {activity.data.items.map((item) => (
            <div key={item.id}>
              <strong>{item.kind}</strong>
              <p>
                {item.actor?.nickname ?? item.actor?.username ?? 'Let’sGo'} ·{' '}
                {item.createdAt.slice(0, 10)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>No activity yet.</p>
      )}
    </Card>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<components['schemas']['NotificationPageDto']>(
        `/v1/notifications?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
  const preferences = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      apiRequest<components['schemas']['PreferenceDto'][]>('/v1/notifications/preferences'),
    retry: false,
  });
  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>('/v1/notifications/read', {
        method: 'POST',
        body: { ids: [id] } satisfies components['schemas']['MarkReadDto'],
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const updatePreference = useMutation({
    mutationFn: (body: components['schemas']['UpdatePreferenceDto']) =>
      apiRequest<components['schemas']['PreferenceDto']>('/v1/notifications/preferences', {
        method: 'PUT',
        body,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });
  if (notifications.isPending || preferences.isPending)
    return <LoadingState label="Loading notifications" />;
  if (notifications.isError || preferences.isError) {
    const error = notifications.error ?? preferences.error;
    return (
      <ErrorState
        title={error instanceof ApiRequestError ? userMessageFor(error.code) : undefined}
        onRetry={() => {
          void notifications.refetch();
          void preferences.refetch();
        }}
      />
    );
  }
  const items = notifications.data.pages.flatMap((page) => page.items);
  return (
    <Card>
      <h1>Notifications</h1>
      {items.length ? (
        <div style={{ display: 'grid', gap: 'var(--lg-space-3)' }}>
          {items.map((item) => (
            <div key={item.id}>
              <strong>{item.title}</strong>
              {item.readAt ? <Badge>Read</Badge> : null}
              <p>{item.body ?? item.category}</p>
              <small>{item.createdAt.slice(0, 10)}</small>
              {!item.readAt ? (
                <div>
                  <Button
                    variant="secondary"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(item.id)}
                  >
                    Mark read
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p>No notifications yet.</p>
      )}
      {notifications.hasNextPage ? (
        <Button
          variant="secondary"
          disabled={notifications.isFetchingNextPage}
          onClick={() => void notifications.fetchNextPage()}
        >
          {notifications.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
      <h2>Notification preferences</h2>
      <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
        {preferences.data.map((preference) => (
          <div key={preference.category}>
            <strong>{preference.category}</strong>
            <label>
              <input
                type="checkbox"
                checked={preference.inApp}
                disabled={updatePreference.isPending}
                onChange={(event) =>
                  updatePreference.mutate({
                    category: preference.category,
                    inApp: event.target.checked,
                    push: preference.push,
                  })
                }
              />{' '}
              In app
            </label>{' '}
            <label>
              <input
                type="checkbox"
                checked={preference.push}
                disabled={updatePreference.isPending}
                onChange={(event) =>
                  updatePreference.mutate({
                    category: preference.category,
                    inApp: preference.inApp,
                    push: event.target.checked,
                  })
                }
              />{' '}
              Push
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [cashAmounts, setCashAmounts] = useState<Record<string, string>>({});
  const payments = useQuery({
    queryKey: ['payments'],
    queryFn: () => apiRequest<components['schemas']['ObligationDto'][]>('/v1/me/payments'),
    retry: false,
  });
  const payCashMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<components['schemas']['ObligationDto']>(
        `/v1/payments/obligations/${id}/pay-cash`,
        { method: 'POST' },
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });
  const cashReceivedMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) =>
      apiRequest<components['schemas']['ObligationDto']>(
        `/v1/payments/obligations/${id}/cash-received`,
        {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
          body: { amountMinor: amount },
        },
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });
  if (payments.isPending) return <LoadingState label="Loading payments" />;
  if (payments.isError) {
    return (
      <ErrorState
        title={
          payments.error instanceof ApiRequestError
            ? userMessageFor(payments.error.code)
            : undefined
        }
        onRetry={() => void payments.refetch()}
      />
    );
  }
  return (
    <Card>
      <h1>My payments</h1>
      {payments.data.length ? (
        <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
          {payments.data.map((obligation) => (
            <div key={obligation.id}>
              <strong>{obligation.kind.replaceAll('_', ' ')}</strong>
              <p>
                Remaining: {obligation.remainingMinor} {obligation.currency} · {obligation.status}
              </p>
              {obligation.capabilities.canPayCash ? (
                <Button
                  variant="secondary"
                  disabled={payCashMutation.isPending}
                  onClick={() => payCashMutation.mutate(obligation.id)}
                >
                  Pay cash
                </Button>
              ) : null}{' '}
              {obligation.capabilities.canConfirmCash ? (
                <>
                  <TextField
                    label={`Cash received for ${obligation.id}`}
                    type="number"
                    min="1"
                    value={cashAmounts[obligation.id] ?? ''}
                    onChange={(event) =>
                      setCashAmounts((current) => ({
                        ...current,
                        [obligation.id]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    variant="secondary"
                    disabled={cashReceivedMutation.isPending || !cashAmounts[obligation.id]}
                    onClick={() =>
                      cashReceivedMutation.mutate({
                        id: obligation.id,
                        amount: Number(cashAmounts[obligation.id]),
                      })
                    }
                  >
                    Confirm cash
                  </Button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p>No payment obligations.</p>
      )}
    </Card>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return <EmptyState title={title} body={t('placeholder.body')} />;
}

export function NotFoundPage() {
  return <EmptyState title={userMessageFor('NOT_FOUND')} />;
}
