import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiRequestError, userMessageFor } from '@/api/errors';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  TextField,
  type BadgeTone,
} from '@/design/ui';
import { t } from '@/i18n';
import { paths } from '@/routes/routes';
import {
  useGame,
  useGames,
  useJoinGame,
  useLeaveGame,
  type GameListQuery,
  type GameSummary,
} from './hooks';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function apiErrorTitle(error: unknown) {
  return error instanceof ApiRequestError ? userMessageFor(error.code) : userMessageFor('UNKNOWN');
}

function gameLocation(game: Pick<GameSummary, 'venue' | 'pitch'>) {
  return [game.venue?.name, game.pitch?.name].filter(Boolean).join(' · ') || 'Location pending';
}

function pitchTone(status: NonNullable<GameSummary['pitchStatus']>): BadgeTone {
  return status.toLowerCase().replace('_', '-') as BadgeTone;
}

function GameCard({ game }: { game: GameSummary }) {
  return (
    <Card>
      <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--lg-space-2)' }}>
          <strong>{game.title || `${game.formatPlayers}v${game.formatPlayers} game`}</strong>
          {game.pitchStatus ? (
            <Badge tone={pitchTone(game.pitchStatus)}>
              {game.pitchStatus.replaceAll('_', ' ').toLowerCase()}
            </Badge>
          ) : null}
        </div>
        <span>{dateFormatter.format(new Date(game.startsAt))}</span>
        <span>{gameLocation(game)}</span>
        <span>
          {game.seats?.spotsLeft ?? 0} spots left · {game.priceMinor / 100} {game.currency}
        </span>
        <Link to={paths.game(game.id)}>View game</Link>
      </div>
    </Card>
  );
}

type FeedFiltersDraft = {
  city: string;
  sort: NonNullable<GameListQuery['sort']>;
  surfaces: string;
  settings: string;
  amenities: string;
  durationMinMinutes: string;
  durationMaxMinutes: string;
  minOrganiserRating: string;
  radiusKm: string;
};

const defaultFeedFilters = (city?: string): FeedFiltersDraft => ({
  city: city ?? '',
  sort: 'STARTING_SOON',
  surfaces: '',
  settings: '',
  amenities: '',
  durationMinMinutes: '',
  durationMaxMinutes: '',
  minOrganiserRating: '',
  radiusKm: '',
});

function numberOrUndefined(value: string) {
  const number = Number(value);
  return value && Number.isFinite(number) ? number : undefined;
}

function gameFilters(
  draft: FeedFiltersDraft,
  location: { lat: number; lng: number } | null,
): GameListQuery {
  const radiusKm = location ? numberOrUndefined(draft.radiusKm) : undefined;
  const usesLocation = radiusKm !== undefined || draft.sort === 'NEAREST';
  return {
    limit: 20,
    availability: 'OPEN_OR_WAITLIST',
    city: draft.city.trim() || undefined,
    sort: draft.sort,
    surfaces: draft.surfaces.trim() || undefined,
    settings: draft.settings.trim() || undefined,
    amenities: draft.amenities.trim() || undefined,
    durationMinMinutes: numberOrUndefined(draft.durationMinMinutes),
    durationMaxMinutes: numberOrUndefined(draft.durationMaxMinutes),
    minOrganiserRating: numberOrUndefined(draft.minOrganiserRating),
    radiusKm,
    lat: usesLocation ? location?.lat : undefined,
    lng: usesLocation ? location?.lng : undefined,
  };
}

export function GamesFeed({ city }: { city?: string } = {}) {
  const [draft, setDraft] = useState<FeedFiltersDraft | null>(null);
  const [applied, setApplied] = useState<GameListQuery | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const values = draft ?? defaultFeedFilters(city);
  const games = useGames(applied ?? gameFilters(values, null));

  const update =
    (field: keyof FeedFiltersDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((current) => ({
        ...(current ?? defaultFeedFilters(city)),
        [field]: event.target.value,
      }));
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApplied(gameFilters(values, location));
  };
  const reset = () => {
    setDraft({ ...defaultFeedFilters(values.city), sort: values.sort });
    setApplied(null);
    setLocation(null);
    setLocationError(null);
  };
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => setLocationError('Location is unavailable.'),
    );
  };

  return (
    <section aria-labelledby="games-heading" style={{ display: 'grid', gap: 'var(--lg-space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 id="games-heading">{t('games.upcoming')}</h2>
        {games.data?.nextCursor ? <span>{t('games.moreAvailable')}</span> : null}
      </div>
      <Card>
        <form onSubmit={apply} style={{ display: 'grid', gap: 'var(--lg-space-3)' }}>
          <TextField label="City" value={values.city} onChange={update('city')} />
          <div className="lg-field">
            <label className="lg-field__label" htmlFor="games-sort">
              Sort
            </label>
            <select
              id="games-sort"
              className="lg-input"
              value={values.sort}
              onChange={update('sort')}
            >
              <option value="RECOMMENDED">Recommended</option>
              <option value="STARTING_SOON">Starting soon</option>
              <option value="NEAREST" disabled={!location}>
                Nearest
              </option>
              <option value="PRICE_LOW_HIGH">Price: low to high</option>
              <option value="ORGANISER_RATING">Organiser rating</option>
              <option value="RECENTLY_ADDED">Recently added</option>
            </select>
          </div>
          <TextField label="Surfaces" value={values.surfaces} onChange={update('surfaces')} />
          <TextField label="Settings" value={values.settings} onChange={update('settings')} />
          <TextField label="Amenities" value={values.amenities} onChange={update('amenities')} />
          <TextField
            label="Minimum duration (minutes)"
            type="number"
            min="0"
            step="1"
            value={values.durationMinMinutes}
            onChange={update('durationMinMinutes')}
          />
          <TextField
            label="Maximum duration (minutes)"
            type="number"
            min="0"
            step="1"
            value={values.durationMaxMinutes}
            onChange={update('durationMaxMinutes')}
          />
          <TextField
            label="Minimum organiser rating"
            type="number"
            min="1"
            max="5"
            step="0.1"
            value={values.minOrganiserRating}
            onChange={update('minOrganiserRating')}
          />
          {navigator.geolocation ? (
            <Button variant="secondary" onClick={requestLocation}>
              Use my location
            </Button>
          ) : null}
          {location ? <span role="status">Location selected</span> : null}
          {location ? (
            <TextField
              label="Radius (km)"
              type="number"
              min="0"
              step="0.1"
              value={values.radiusKm}
              onChange={update('radiusKm')}
            />
          ) : null}
          {locationError ? <span role="alert">{locationError}</span> : null}
          <div style={{ display: 'flex', gap: 'var(--lg-space-2)', flexWrap: 'wrap' }}>
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="secondary" onClick={reset}>
              Reset filters
            </Button>
          </div>
        </form>
      </Card>
      {games.isPending ? <LoadingState label={t('games.loading')} /> : null}
      {games.isError ? (
        <ErrorState title={apiErrorTitle(games.error)} onRetry={() => void games.refetch()} />
      ) : null}
      {games.data && games.data.items.length === 0 ? (
        <EmptyState title={t('games.empty')} body={t('games.emptyBody')} />
      ) : null}
      {games.data?.items.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </section>
  );
}

export function GameDetailsPage() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const game = useGame(gameId);
  const join = useJoinGame();
  const leave = useLeaveGame();
  if (game.isPending) return <LoadingState label={t('games.loading')} />;
  if (game.isError)
    return <ErrorState title={apiErrorTitle(game.error)} onRetry={() => void game.refetch()} />;
  if (!game.data) return <EmptyState title={t('games.notFound')} />;
  const value = game.data;
  const canJoin = value.capabilities.canJoin || value.capabilities.canRequestToJoin;
  const joinLabel = value.capabilities.canRequestToJoin ? t('games.requestJoin') : t('games.join');
  const viewerJoined = Boolean(value.viewer.participation);
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <Button variant="secondary" onClick={() => navigate(-1)}>
        {t('common.back')}
      </Button>
      <Card>
        <div style={{ display: 'grid', gap: 'var(--lg-space-3)' }}>
          <h1>{value.title || `${value.formatPlayers}v${value.formatPlayers} game`}</h1>
          <p>{dateFormatter.format(new Date(value.startsAt))}</p>
          <p>{gameLocation(value)}</p>
          <p>
            {value.seats.spotsLeft} spots left · {value.priceMinor / 100} {value.currency}
          </p>
          <p>{value.notes || t('games.noNotes')}</p>
          {join.isError || leave.isError ? (
            <p role="alert">{apiErrorTitle(join.error ?? leave.error)}</p>
          ) : null}
          {viewerJoined ? (
            <Button
              variant="secondary"
              disabled={!value.capabilities.canLeave || leave.isPending}
              onClick={() => leave.mutate(value.id)}
            >
              {leave.isPending ? t('games.working') : t('games.leave')}
            </Button>
          ) : (
            <Button
              disabled={!canJoin || join.isPending}
              onClick={() => join.mutate({ id: value.id })}
            >
              {join.isPending ? t('games.working') : joinLabel}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
