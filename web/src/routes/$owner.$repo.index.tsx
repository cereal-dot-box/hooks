import { createFileRoute } from '@tanstack/react-router'

import { Breadcrumb } from '#/components/breadcrumb'
import { PackageRow } from '#/components/package-row'
import { getPackagesByRepo } from '#/data/server-fns'

export const Route = createFileRoute('/$owner/$repo/')({
  loader: async ({ params }) => {
    return {
      owner: params.owner,
      repo: params.repo,
      packages: await getPackagesByRepo({
        data: { owner: params.owner, repo: params.repo },
      }),
    }
  },
  component: RepoRoute,
})

function RepoRoute() {
  const { owner, repo, packages } = Route.useLoaderData()

  return (
    <main className="page page--narrow">
      <Breadcrumb
        items={[{ node: `${owner}/${repo}`, current: true }]}
      />
      <header className="page__hero">
        <p className="eyebrow">repo</p>
        <p className="page__hero-lede">
          {owner}/{repo}
        </p>
        <p className="page__hero-sub">
          <span>
            {packages.length} package{packages.length === 1 ? '' : 's'}
          </span>
        </p>
      </header>

      {packages.length === 0 ? (
        <p className="empty">No packages from this repo are listed.</p>
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
