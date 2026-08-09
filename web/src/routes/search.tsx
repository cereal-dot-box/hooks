import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

import { PackageRow } from '#/components/package-row'
import { searchPackages } from '#/data/server-fns'

export const Route = createFileRoute('/search')({
  validateSearch: z.object({
    q: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({ q: (search.q ?? '').trim() }),
  loader: async ({ deps }) => {
    if (!deps.q) return { q: '', results: [] }
    return {
      q: deps.q,
      results: await searchPackages({ data: { q: deps.q } }),
    }
  },
  component: SearchRoute,
})

function SearchRoute() {
  const { q, results } = Route.useLoaderData()

  return (
    <main className="page">
      <header className="page__hero">
        <p className="eyebrow">search</p>
        <form className="search-form" method="get" action="/search">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="search by name, description, or author"
            aria-label="search"
            className="search-form__input"
            autoFocus
          />
          <button type="submit" className="search-form__submit">
            search
          </button>
        </form>
        {q && (
          <p className="page__hero-sub">
            <span>
              {results.length} result{results.length === 1 ? '' : 's'} for
            </span>
            <span>“{q}”</span>
          </p>
        )}
      </header>

      {!q ? (
        <p className="empty">Type a search above.</p>
      ) : results.length === 0 ? (
        <p className="empty">No packages match “{q}”.</p>
      ) : (
        <ol className="package-list">
          {results.map((pkg, i) => (
            <PackageRow key={pkg.id} pkg={pkg} rank={i + 1} />
          ))}
        </ol>
      )}
    </main>
  )
}
