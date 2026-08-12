import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { InstallCommand } from '#/components/install-command'
import { PackageRow, RepoRow } from '#/components/package-row'
import { PACKAGES } from '#/data/packages'
import { getLeaderboard } from '#/data/server-fns'
import { ALL_EVENTS, type EventId } from '#/lib/events'

export const Route = createFileRoute('/')({
  loader: async () => {
    const packages = await getLeaderboard({ data: 'all-time' })
    return { packages }
  },
  component: Home,
})

type GroupMode = 'hook' | 'repo'

/** First hook event that appears in the canonical order; falls back to first. */
function primaryEvent(pkg: (typeof PACKAGES)[number]): EventId {
  for (const hook of pkg.hooks) {
    if ((ALL_EVENTS as readonly string[]).includes(hook.event)) return hook.event
  }
  return pkg.hooks[0]?.event ?? 'SessionStart'
}

/** Position in ALL_EVENTS, or ALL_EVENTS.length if not listed. */
function eventRank(event: EventId): number {
  const i = (ALL_EVENTS as readonly string[]).indexOf(event)
  return i === -1 ? ALL_EVENTS.length : i
}

type RepoAggregate = {
  owner: string
  repo: string
  hookNames: string[]
  events: string[]
  installCountAllTime: number
  installCountTrending: number
}

function Home() {
  const { packages } = Route.useLoaderData()

  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupMode>('hook')
  const [activeEvent, setActiveEvent] = useState<EventId | 'all'>('all')

  // Filter chips: canonical event order, restricted to events present in
  // the data, with any non-canonical events appended at the end.
  const chipEvents = useMemo(() => {
    const present = new Set<string>()
    for (const p of PACKAGES) {
      for (const h of p.hooks) present.add(h.event)
    }
    const canonical = (ALL_EVENTS as readonly string[]).filter((e) =>
      present.has(e),
    )
    const extras = [...present].filter(
      (e) => !(ALL_EVENTS as readonly string[]).includes(e),
    )
    return [...canonical, ...extras]
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return packages.filter((pkg) => {
      const matchesQuery =
        !q ||
        pkg.name.toLowerCase().includes(q) ||
        pkg.owner.toLowerCase().includes(q) ||
        pkg.repo.toLowerCase().includes(q)
      const matchesEvent =
        activeEvent === 'all' ||
        pkg.hooks.some((h) => h.event === activeEvent)
      return matchesQuery && matchesEvent
    })
  }, [packages, query, activeEvent])

  const byHook = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const rankDiff = eventRank(primaryEvent(a)) - eventRank(primaryEvent(b))
      if (rankDiff !== 0) return rankDiff
      return b.installCountAllTime - a.installCountAllTime
    })
  }, [filtered])

  const byRepo = useMemo(() => {
    const map = new Map<string, RepoAggregate>()
    for (const p of filtered) {
      const existing = map.get(p.owner)
      if (existing) {
        existing.hookNames.push(p.name)
        for (const h of p.hooks) {
          if (!existing.events.includes(h.event)) existing.events.push(h.event)
        }
        existing.installCountAllTime += p.installCountAllTime
        existing.installCountTrending += p.installCountTrending
      } else {
        map.set(p.owner, {
          owner: p.owner,
          repo: p.repo,
          hookNames: [p.name],
          events: Array.from(new Set(p.hooks.map((h) => h.event))),
          installCountAllTime: p.installCountAllTime,
          installCountTrending: p.installCountTrending,
        })
      }
    }
    return [...map.values()].sort(
      (a, b) => b.installCountAllTime - a.installCountAllTime,
    )
  }, [filtered])

  const rows = group === 'hook' ? byHook : byRepo
  const isEmpty = rows.length === 0

  return (
    <main className="page">
      {/* ===== hero: asymmetric 5/3 ===== */}
      <section className="hero">
        <div className="hero__main">
          {/* signature: install command as hero */}
          <p className="hero__cmd">
            <span className="hero__cmd-prompt">$</span>npx agenthooks add
            <br />
            <span className="hero__cmd-pkg">jared-paul/session-banner</span>
            <span className="hero__cursor" aria-hidden="true" />
          </p>
          <InstallCommand
            command="npx agenthooks add jared-paul/session-banner"
            prompt="Run `npx agenthooks add -y jared-paul/session-banner` now. Hooks resolve at ~/.agents/hooks/<hookId>/."
          />
        </div>
        <div className="hero__aside">
          <p className="hero__sub">
            Hooks let you observe, control, and extend the agent loop using
            custom scripts. Add one to enhance your agent workflow.
          </p>
        </div>
      </section>

      {/* ===== most installed ===== */}
      <section className="board" id="most-installed">
        <div className="section-head">
          <span className="section-head__title section-head__title--lg">
            Most installed
          </span>
          <div
            className="tabs tabs--group"
            role="tablist"
            aria-label="group by"
          >
            <button
              type="button"
              className="tabs__tab"
              aria-selected={group === 'hook'}
              onClick={() => setGroup('hook')}
              role="tab"
            >
              by hook
            </button>
            <button
              type="button"
              className="tabs__tab"
              aria-selected={group === 'repo'}
              onClick={() => setGroup('repo')}
              role="tab"
            >
              by repo
            </button>
          </div>
        </div>

        <div className="board__tools">
          <div className="board__filters">
            <button
              type="button"
              className="chip"
              aria-pressed={activeEvent === 'all'}
              onClick={() => setActiveEvent('all')}
            >
              all
            </button>
            {chipEvents.map((event) => (
              <button
                key={event}
                type="button"
                className="chip"
                aria-pressed={activeEvent === event}
                onClick={() =>
                  setActiveEvent(
                    activeEvent === event ? 'all' : (event as EventId),
                  )
                }
              >
                {event}
              </button>
            ))}
          </div>
          <label className="search">
            <svg
              className="search__icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11l3 3" strokeLinecap="round" />
            </svg>
            <input
              className="search__input"
              type="search"
              placeholder="search packages…"
              aria-label="search packages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {isEmpty ? (
          <p className="board__empty">no packages match your filters.</p>
        ) : group === 'hook' ? (
          <ol className="list">
            {byHook.map((pkg, i) => (
              <PackageRow key={pkg.id} pkg={pkg} rank={i + 1} />
            ))}
          </ol>
        ) : (
          <ol className="list">
            {byRepo.map((repo, i) => (
              <RepoRow key={repo.owner} repo={repo} rank={i + 1} />
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
