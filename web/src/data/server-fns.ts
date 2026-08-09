import { createServerFn } from '@tanstack/react-start'

import { AGENTS, PACKAGES } from './packages'
import type { AgentName, LeaderboardSort, Package } from './types'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
// Realistic-feeling latency so loading skeletons and cache headers get exercised.
const jitter = () => 50 + Math.random() * 100

function scoreFor(pkg: Package, sort: LeaderboardSort): number {
  if (sort === 'trending') return pkg.installCountTrending
  if (sort === 'hot') return pkg.installCountHot
  return pkg.installCountAllTime
}

export const getLeaderboard = createServerFn({ method: 'GET' })
  .validator((raw): LeaderboardSort => {
    const sort = (raw as { sort?: string } | undefined)?.sort
    if (sort === 'trending' || sort === 'hot') return sort
    return 'all-time'
  })
  .handler(async ({ data }) => {
    await delay(jitter())
    return [...PACKAGES].sort((a, b) => scoreFor(b, data) - scoreFor(a, data))
  })

export const getPackage = createServerFn({ method: 'GET' })
  .validator(
    (raw): { owner: string; repo: string; name: string } => {
      const r = raw as { owner?: string; repo?: string; name?: string }
      if (!r?.owner || !r?.repo || !r?.name) {
        throw new Error('owner, repo, and name are required')
      }
      return { owner: r.owner, repo: r.repo, name: r.name }
    },
  )
  .handler(async ({ data }) => {
    await delay(jitter())
    const pkg = PACKAGES.find(
      (p) =>
        p.owner === data.owner && p.repo === data.repo && p.name === data.name,
    )
    if (!pkg) {
      throw new Error(
        `package not found: ${data.owner}/${data.repo}/${data.name}`,
      )
    }
    return pkg
  })

export const getPackagesByRepo = createServerFn({ method: 'GET' })
  .validator(
    (raw): { owner: string; repo: string } => {
      const r = raw as { owner?: string; repo?: string }
      if (!r?.owner || !r?.repo) throw new Error('owner and repo are required')
      return { owner: r.owner, repo: r.repo }
    },
  )
  .handler(async ({ data }) => {
    await delay(jitter())
    return PACKAGES.filter(
      (p) => p.owner === data.owner && p.repo === data.repo,
    )
  })

export const getPackagesByEvent = createServerFn({ method: 'GET' })
  .validator(
    (raw): { event: string } => {
      const r = raw as { event?: string }
      if (!r?.event) throw new Error('event is required')
      return { event: r.event }
    },
  )
  .handler(async ({ data }) => {
    await delay(jitter())
    return PACKAGES.filter((p) => p.hooks.some((h) => h.event === data.event))
  })

export const getPackagesByAgent = createServerFn({ method: 'GET' })
  .validator(
    (raw): { agent: AgentName } => {
      const r = raw as { agent?: string }
      if (r?.agent !== 'claude-code' && r?.agent !== 'codex') {
        throw new Error('agent must be claude-code or codex')
      }
      return { agent: r.agent }
    },
  )
  .handler(async ({ data }) => {
    await delay(jitter())
    return PACKAGES.filter((p) =>
      // A package supports an agent if no hook narrows `agents` away from it.
      p.hooks.every((h) => !h.agents || h.agents.includes(data.agent)),
    )
  })

export const searchPackages = createServerFn({ method: 'GET' })
  .validator((raw): { q: string } => {
    const r = raw as { q?: string } | undefined
    return { q: (r?.q ?? '').trim() }
  })
  .handler(async ({ data }) => {
    await delay(jitter())
    if (!data.q) return []
    const needle = data.q.toLowerCase()
    return PACKAGES.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.owner.toLowerCase().includes(needle),
    )
  })

export const getAgents = createServerFn({ method: 'GET' }).handler(async () => {
  await delay(jitter() / 2)
  return AGENTS
})
