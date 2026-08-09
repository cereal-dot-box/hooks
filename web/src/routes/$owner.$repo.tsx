import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$owner/$repo')({
  component: RepoLayout,
})

function RepoLayout() {
  return <Outlet />
}
