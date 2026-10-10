import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiRequestError, userMessageFor } from '@/api/errors';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, TextField } from '@/design/ui';
import { t } from '@/i18n';
import type { components } from '@/api/schema';
import { useSearch, type SearchType } from './hooks';

const searchTypes: Array<{ value: SearchType; label: string }> = [
  { value: 'people', label: 'People' },
  { value: 'clubs', label: 'Clubs' },
  { value: 'venues', label: 'Venues' },
  { value: 'pitches', label: 'Pitches' },
  { value: 'tournaments', label: 'Tournaments' },
  { value: 'events', label: 'Events' },
];

type SearchResult = components['schemas']['SearchResultDto'];

function apiErrorTitle(error: unknown) {
  return error instanceof ApiRequestError ? userMessageFor(error.code) : userMessageFor('UNKNOWN');
}

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <Card>
      <div style={{ display: 'grid', gap: 'var(--lg-space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--lg-space-2)' }}>
          <strong>{result.name || result.handle || result.id}</strong>
          <Badge>{result.entityType.toLowerCase()}</Badge>
        </div>
        {result.handle ? <span>{result.handle}</span> : null}
        {result.subtitle ? <span>{result.subtitle}</span> : null}
      </div>
    </Card>
  );
}

function resultItems(data: components['schemas']['SearchResponseDto']) {
  if (data.items) return data.items;
  return data.sections?.flatMap((section) => section.items) ?? [];
}

export function SearchPage({ filterMode = false }: { filterMode?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') ?? '');
  const query = params.get('q')?.trim() ?? '';
  const rawType = params.get('type');
  const selectedType = searchTypes.some((type) => type.value === rawType)
    ? (rawType as SearchType)
    : null;
  const search = useSearch(query ? { q: query, type: selectedType ?? undefined } : undefined);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams(params);
    const value = input.trim();
    if (value) next.set('q', value);
    else next.delete('q');
    if (!filterMode) next.delete('type');
    setParams(next);
  };

  const changeType = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('type', value);
    else next.delete('type');
    setParams(next);
  };

  const items = search.data ? resultItems(search.data) : [];
  return (
    <div style={{ display: 'grid', gap: 'var(--lg-space-4)' }}>
      <div>
        <h1>{filterMode ? t('search.filtersTitle') : t('search.title')}</h1>
        <p>{filterMode ? t('search.filtersBody') : t('search.body')}</p>
      </div>
      <Card>
        <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--lg-space-3)' }}>
          <TextField
            label={t('search.query')}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('search.queryPlaceholder')}
          />
          {filterMode ? (
            <label>
              {t('search.type')}
              <select
                value={selectedType ?? ''}
                onChange={(event) => changeType(event.target.value)}
              >
                <option value="">{t('search.allTypes')}</option>
                {searchTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button type="submit">{t('search.submit')}</Button>
        </form>
      </Card>
      {!query ? <EmptyState title={t('search.startTitle')} body={t('search.startBody')} /> : null}
      {query && search.isPending ? <LoadingState label={t('search.loading')} /> : null}
      {query && search.isError ? (
        <ErrorState title={apiErrorTitle(search.error)} onRetry={() => void search.refetch()} />
      ) : null}
      {query && search.data && items.length === 0 ? (
        <EmptyState title={t('search.empty')} body={t('search.emptyBody')} />
      ) : null}
      {items.length ? (
        <section
          aria-labelledby="search-results-heading"
          style={{ display: 'grid', gap: 'var(--lg-space-3)' }}
        >
          <h2 id="search-results-heading">{t('search.results')}</h2>
          {items.map((item) => (
            <ResultCard key={`${item.entityType}-${item.id}`} result={item} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
