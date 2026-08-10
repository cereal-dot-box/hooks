import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { InstallCommand } from '#/components/install-command'
import { LifecycleSpine } from '#/components/lifecycle-spine'
import { PackageRow } from '#/components/package-row'
import { PACKAGES } from '#/data/packages'
import { getLeaderboard } from '#/data/server-fns'
import { EVENT_INFO, type EventId } from '#/lib/events'

export const Route = createFileRoute('/')({
  loader: async () => {
    const packages = await getLeaderboard({ data: 'all-time' })
    return { packages }
  },
  component: Home,
})

type GroupMode = 'hook' | 'repo'

const EVENT_ORDER: EventId[] = [
  ...(Object.keys(EVENT_INFO) as EventId[]),
]

function primaryEvent(pkg: (typeof PACKAGES)[number]): EventId {
  for (const hook of pkg.hooks) {
    if (EVENT_ORDER.includes(hook.event)) return hook.event
  }
  return pkg.hooks[0]?.event ?? 'SessionStart'
}

function eventRank(event: EventId): number {
  const i = EVENT_ORDER.indexOf(event)
  return i === -1 ? EVENT_ORDER.length : i
}

function Home() {
  const { packages } = Route.useLoaderData()

  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupMode>('hook')
  const [activeEvent, setActiveEvent] = useState<EventId | 'all'>('all')

  // count packages per event, for the lifecycle rail badges
  const counts = useMemo(() => {
    const map = {} as Record<EventId, number>
    for (const event of EVENT_ORDER) map[event] = 0
    for (const pkg of PACKAGES) {
      for (const hook of pkg.hooks) {
        if (hook.event in map) map[hook.event]++
      }
    }
    return map
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return packages.filter((pkg) => {
      const matchesQuery =
        !q ||
        pkg.name.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q) ||
        pkg.owner.toLowerCase().includes(q) ||
        pkg.repo.toLowerCase().includes(q)
      const matchesEvent =
        activeEvent === 'all' ||
        pkg.hooks.some((h) => h.event === activeEvent)
      return matchesQuery && matchesEvent
    })
  }, [packages, query, activeEvent])

  const ordered = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => b.installCountAllTime - a.installCountAllTime,
    )
    if (group === 'hook') {
      sorted.sort(
        (a, b) =>
          eventRank(primaryEvent(a)) - eventRank(primaryEvent(b)),
      )
    } else {
      sorted.sort((a, b) => {
        if (a.owner !== b.owner) return a.owner.localeCompare(b.owner)
        return b.installCountAllTime - a.installCountAllTime
      })
    }
    return sorted
  }, [filtered, group])

  return (
    <main className="page">
      {/* ===== hero ===== */}
      <section className="hero">
        <p className="hero__eyebrow">the open hook registry</p>
        <h1 className="hero__h1">
          Lifecycle hooks <em>for AI coding agents.</em>
        </h1>
        <p className="hero__sub">
          Installable automations that fire at key moments in your agent's
          run: session start, before a tool runs, on stop. One command to
          add, one to remove. No magic, just shell.
        </p>
      </section>

      {/* ===== usage ===== */}
      <InstallCommand
        command="npx agenthooks add jared-paul/session-banner"
        prompt="Run `npx agenthooks add -y jared-paul/session-banner` now. Hooks resolve at ~/.agents/hooks/<hookId>/."
      />

      {/* ===== main + lifecycle sidebar ===== */}
      <div className="layout">
        <section className="board">
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
                By hook
              </button>
              <button
                type="button"
                className="tabs__tab"
                aria-selected={group === 'repo'}
                onClick={() => setGroup('repo')}
                role="tab"
              >
                By repo
              </button>
            </div>
          </div>

          <div className="board__tools">
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

          {ordered.length === 0 ? (
            <p className="board__empty">no packages match your filters.</p>
          ) : (
            <ol className="list">
              {ordered.map((pkg, i) => (
                <PackageRow key={pkg.id} pkg={pkg} rank={i + 1} />
              ))}
            </ol>
          )}
        </section>

        <aside className="lifecycle lifecycle--filter" id="lifecycle">
          <div className="section-head">
            <span className="section-head__title">The lifecycle</span>
          </div>
          <LifecycleSpine
            variant="filter"
            activeEvent={activeEvent}
            onSelect={setActiveEvent}
            counts={counts}
          />
        </aside>
      </div>
    </main>
  )
}
