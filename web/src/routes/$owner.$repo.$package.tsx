import { Link, createFileRoute } from '@tanstack/react-router'

import { InstallCommand } from '#/components/install-command'
import { Markdown } from '#/components/markdown'
import { getPackage } from '#/data/server-fns'
import { EVENT_INFO, isEventId } from '#/lib/events'
import { isoToDate } from '#/lib/format'

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
  const installCommand = `npx agenthooks add ${pkg.owner}/${pkg.name}`
  const installPrompt = `Run \`npx agenthooks add -y ${pkg.owner}/${pkg.name}\` now. Hooks resolve at ~/.agents/hooks/<hookId>/.`

  return (
    <main className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">agenthooks</Link>
        <span className="breadcrumb__sep">/</span>
        <Link
          to="/$owner/$repo"
          params={{ owner: pkg.owner, repo: pkg.repo }}
        >
          {pkg.owner}
        </Link>
        <span className="breadcrumb__sep">/</span>
        <Link
          to="/$owner/$repo"
          params={{ owner: pkg.owner, repo: pkg.repo }}
        >
          {pkg.repo}
        </Link>
        <span className="breadcrumb__sep">/</span>
        <span className="breadcrumb__current">{pkg.name}</span>
      </nav>

      <div className="page__cols">
        <div className="page__content">
          {/* ===== hook header ===== */}
          <header className="hook-head">
            <h1 className="hook-head__name">{pkg.name}</h1>
            <p className="hook-head__desc">{pkg.description}</p>
          </header>

          {/* ===== usage ===== */}
          <section className="usage">
            <div className="section-head">
              <span className="section-head__title">Usage</span>
            </div>
            <InstallCommand command={installCommand} prompt={installPrompt} />
          </section>

          {/* ===== hooks ===== */}
          <section className="hooks">
            <div className="section-head">
              <span className="section-head__title">Hooks</span>
            </div>
            <div className="hooks__list">
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
                                {ov.matcher && (
                                  <code>matcher={ov.matcher}</code>
                                )}
                                {ov.matcher && ov.command && ' · '}
                                {ov.command && (
                                  <code>command override</code>
                                )}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ===== files ===== */}
          {pkg.files && pkg.files.length > 0 && (
            <section className="files">
              <div className="section-head">
                <span className="section-head__title">Files</span>
              </div>
              <ul className="files__list">
                {pkg.files.map((f) => (
                  <li key={f} className="files__item">
                    <span className="files__icon" aria-hidden="true">
                      ▸
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ===== readme ===== */}
          <section className="readme">
            <div className="section-head">
              <span className="section-head__title">README.md</span>
            </div>
            <Markdown source={pkg.readmeMd} />
          </section>
        </div>

        {/* ===== meta aside ===== */}
        <aside className="page__aside">
          <div className="hook-meta">
            <div className="hook-meta__item">
              <span className="hook-meta__label hook-meta__label--lg">
                installs
              </span>
              <span className="hook-meta__value hook-meta__value--lg">
                {pkg.installCountAllTime.toLocaleString()}
              </span>
              <Sparkline />
            </div>
            <div className="hook-meta__item">
              <span className="hook-meta__label">events</span>
              <span className="hook-meta__value">{events.join(', ')}</span>
            </div>
            <div className="hook-meta__item">
              <span className="hook-meta__label">repo</span>
              <a
                className="hook-meta__value hook-meta__link"
                href={`https://github.com/${pkg.owner}/${pkg.repo}`}
              >
                <span className="hook-meta__link-text">
                  {pkg.owner}/{pkg.repo}
                </span>
                <span className="hook-meta__arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            </div>
            <div className="hook-meta__item">
              <span className="hook-meta__label">updated</span>
              <span className="hook-meta__value">
                {isoToDate(pkg.updatedAt)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

/** Decorative upward sparkline — purely visual, not real data. */
function Sparkline() {
  return (
    <svg
      className="hook-meta__sparkline"
      viewBox="0 0 180 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M 0 32 L 26 28 L 52 23 L 77 19 L 103 14 L 129 10 L 154 6 L 180 3" />
    </svg>
  )
}
