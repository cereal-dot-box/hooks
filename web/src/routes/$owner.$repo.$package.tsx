import { Link, createFileRoute } from '@tanstack/react-router'

import { InstallCommand } from '#/components/install-command'
import { LifecycleSpine } from '#/components/lifecycle-spine'
import { Markdown } from '#/components/markdown'
import { getPackage } from '#/data/server-fns'
import { EVENT_INFO, isEventId } from '#/lib/events'

export const Route = createFileRoute('/$owner/$repo/$package')({
  loader: async ({ params }) => {
    return {
      pkg: await getPackage({
        data: {
          owner: params.owner,
          repo: params.repo,
          name: params.package,
        },
      }),
    }
  },
  component: PackageDetail,
})

function PackageDetail() {
  const { pkg } = Route.useLoaderData()
  const events = Array.from(new Set(pkg.hooks.map((h) => h.event)))
  const installCommand = `npx agenthooks add github:${pkg.owner}/${pkg.repo}`

  return (
    <main className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">directory</Link>
        <span className="breadcrumb__sep">/</span>
        <span>{pkg.owner}</span>
        <span className="breadcrumb__sep">/</span>
        <span>{pkg.repo}</span>
        <span className="breadcrumb__sep">/</span>
        <span className="breadcrumb__current">{pkg.name}</span>
      </nav>

      <article className="man">
        <section>
          <p className="eyebrow">name</p>
          <h1 className="man__name-title">{pkg.name}</h1>
          <p className="man__name-meta">
            {pkg.owner}/{pkg.repo}
          </p>
          <p className="man__name-desc">{pkg.description}</p>
        </section>

        <section>
          <p className="eyebrow">synopsis</p>
          <InstallCommand command={installCommand} />
        </section>

        <section>
          <p className="eyebrow">hooks — lifecycle</p>
          <LifecycleSpine events={events} variant="detail" />
        </section>

        <section>
          <p className="eyebrow">hooks — commands</p>
          {pkg.hooks.map((hook) => {
            const eventInfo = isEventId(hook.event)
              ? EVENT_INFO[hook.event]
              : undefined
            return (
              <div key={hook.id} className="hook">
                <div className="hook__head">
                  <div className="hook__id">{hook.id}</div>
                  {eventInfo && (
                    <Link
                      to="/event/$event"
                      params={{ event: hook.event }}
                      className="hook__event"
                    >
                      {hook.event}
                    </Link>
                  )}
                  {hook.matcher && (
                    <div className="hook__matcher">
                      matcher: <code>{hook.matcher}</code>
                    </div>
                  )}
                </div>
                <div className="hook__body">
                  <pre className="hook__command">{hook.command}</pre>
                  {hook.agentOverrides && (
                    <div className="hook__overrides">
                      {Object.entries(hook.agentOverrides).map(
                        ([agent, ov]) => (
                          <span
                            key={agent}
                            className="hook__overrides-item"
                          >
                            <span className="hook__overrides-key">
                              {agent}:
                            </span>{' '}
                            {ov.matcher && <code>matcher={ov.matcher}</code>}
                            {ov.matcher && ov.command && ' · '}
                            {ov.command && <code>command override</code>}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {pkg.files && pkg.files.length > 0 && (
          <section>
            <p className="eyebrow">files</p>
            <ul className="files">
              {pkg.files.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <p className="eyebrow">readme</p>
          <Markdown source={pkg.readmeMd} />
        </section>
      </article>
    </main>
  )
}
