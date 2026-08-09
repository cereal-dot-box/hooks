import { createFileRoute, notFound } from '@tanstack/react-router'

import { PackageRow } from '#/components/package-row'
import { getPackagesByEvent } from '#/data/server-fns'
import { EVENT_INFO, isEventId } from '#/lib/events'

export const Route = createFileRoute('/event/$event')({
  loader: async ({ params }) => {
    if (!isEventId(params.event)) {
      throw notFound()
    }
    return {
      event: params.event,
      info: EVENT_INFO[params.event],
      packages: await getPackagesByEvent({ data: { event: params.event } }),
    }
  },
  component: EventRoute,
})

function EventRoute() {
  const { event, info, packages } = Route.useLoaderData()

  return (
    <main className="page">
      <header className="page__hero">
        <p className="eyebrow">filter: event</p>
        <p className="page__hero-lede">{event}</p>
        <p className="page__hero-sub">
          <span>{info.fires}</span>
          <span>·</span>
          <span>
            {packages.length} package{packages.length === 1 ? '' : 's'}
          </span>
        </p>
      </header>

      {packages.length === 0 ? (
        <p className="empty">No packages hook into this event yet.</p>
      ) : (
        <ol className="package-list">
          {packages.map((pkg, i) => (
            <PackageRow key={pkg.id} pkg={pkg} rank={i + 1} />
          ))}
        </ol>
      )}
    </main>
  )
}
