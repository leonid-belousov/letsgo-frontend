import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from '@/features/search/pages';

function renderRoute(path: string, element: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/search" element={element} />
          <Route path="/filters" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return new Response(
        JSON.stringify({
          q: new URL(url).searchParams.get('q'),
          type: new URL(url).searchParams.get('type'),
          sections: [
            {
              type: 'people',
              entityType: 'PERSON',
              total: 1,
              items: [
                {
                  entityType: 'PERSON',
                  id: 'person-1',
                  name: 'Alice',
                  handle: '@alice',
                  subtitle: 'Baku',
                },
              ],
            },
          ],
          items: null,
          nextCursor: null,
          total: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('search routes', () => {
  it('searches from the search route and renders typed results', async () => {
    const user = userEvent.setup();
    renderRoute('/search', <SearchPage />);

    await user.type(screen.getByLabelText('Search'), 'alice');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/search?q=alice'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('applies the selected type on the filters route', async () => {
    const user = userEvent.setup();
    renderRoute('/filters?q=club', <SearchPage filterMode />);

    await user.selectOptions(screen.getByLabelText('Type'), 'clubs');

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/search?q=club&type=clubs'),
        expect.objectContaining({ method: 'GET' }),
      ),
    );
  });
});
