import { Link, createFileRoute } from '@tanstack/react-router'

import { InstallCommand } from '#/components/install-command'
import { Markdown } from '#/components/markdown'
import { getPackage } from '#/data/server-fns'
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

          {/* ===== files ===== */}
          {pkg.files && pkg.files.length > 0 && (
            <section className="files">
              <div className="section-head">
                <span className="section-head__title">Files</span>
              </div>
              <div className="files__panel">
                <div className="files__header">
                  <span className="files__path">{pkg.name}/</span>
                  <a
                    className="files__source"
                    href={`https://github.com/${pkg.owner}/${pkg.repo}`}
                  >
                    view source ↗
                  </a>
                </div>
                <ul className="files__list">
                  {pkg.files.map((f) => {
                    const dot = f.lastIndexOf('.')
                    const ext = dot > 0 ? f.slice(dot + 1) : ''
                    return (
                      <li key={f} className="files__item">
                        <a
                          className="files__link"
                          href={`https://github.com/${pkg.owner}/${pkg.repo}/blob/main/${f}`}
                        >
                          <svg
                            className="files__icon"
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.25"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <path d="M3.5 1.5h4.5l3 3v8a0.5 0.5 0 0 1-0.5 0.5h-7A0.5 0.5 0 0 1 3 12.5V2A0.5 0.5 0 0 1 3.5 1.5z" />
                            <path d="M8 1.5V4.5H11" />
                          </svg>
                          <span className="files__name">{f}</span>
                          {ext && <span className="files__ext">{ext}</span>}
                          <span className="files__arrow" aria-hidden="true">
                            →
                          </span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
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
