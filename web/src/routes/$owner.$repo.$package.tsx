import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Breadcrumb } from '#/components/breadcrumb'
import { InstallCommand } from '#/components/install-command'
import { Markdown } from '#/components/markdown'
import { getPackage } from '#/data/server-fns'
import type { Package } from '#/data/types'
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
  const installCommand = `npx @cerealbox/hooks add ${pkg.owner}/${pkg.name}`
  const installPrompt = `Run \`npx @cerealbox/hooks add -y ${pkg.owner}/${pkg.name}\` now. Hooks resolve at ~/.agents/hooks/<hookId>/.`

  return (
    <main className="page">
      <Breadcrumb
        items={[
          {
            node: (
              <Link to="/$owner/$repo" params={{ owner: pkg.owner, repo: pkg.repo }}>
                {pkg.owner}
              </Link>
            ),
          },
          {
            node: (
              <Link to="/$owner/$repo" params={{ owner: pkg.owner, repo: pkg.repo }}>
                {pkg.repo}
              </Link>
            ),
          },
          { node: pkg.name, current: true },
        ]}
      />

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

          {/* ===== readme ===== */}
          <section className="readme">
            <div className="section-head">
              <span className="section-head__title">README.md</span>
            </div>
            <Markdown source={pkg.readmeMd} />
          </section>

          {/* ===== files ===== */}
          {pkg.files && pkg.files.length > 0 && (
            <section className="files">
              <div className="section-head">
                <span className="section-head__title">Files</span>
              </div>
              <FilesPanel pkg={pkg} />
            </section>
          )}
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

function FilesPanel({ pkg }: { pkg: Package }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  const toggle = (file: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(file)) next.delete(file)
      else next.add(file)
      return next
    })
  }

  return (
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
        {pkg.files!.map((f) => {
          const dot = f.lastIndexOf('.')
          const ext = dot > 0 ? f.slice(dot + 1) : ''
          const isOpen = open.has(f)
          const contents = pkg.fileContents?.[f]
          return (
            <li key={f} className={`files__item${isOpen ? ' files__item--open' : ''}`}>
              <button
                type="button"
                className="files__row"
                aria-expanded={isOpen}
                aria-controls={`file-content-${f.replace(/\W/g, '-')}`}
                onClick={() => toggle(f)}
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
                  {isOpen ? '↓' : '→'}
                </span>
              </button>
              {isOpen && (
                <div
                  id={`file-content-${f.replace(/\W/g, '-')}`}
                  className="files__content"
                >
                  {contents != null ? (
                    <pre className="files__code">
                      <code>{contents}</code>
                    </pre>
                  ) : (
                    <div className="files__empty">
                      Source not uploaded for this package yet.
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
