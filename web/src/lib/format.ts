/** Compact integer formatting: 1842 → "1.8k", 3921 → "3.9k". */
export function compactCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

/** Render an ISO date as YYYY-MM-DD. */
export function isoToDate(iso: string): string {
  // Trust the source; just trim the time portion.
  return iso.slice(0, 10)
}

/** "5 days ago", "today", etc. from an ISO date string. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const dayMs = 86_400_000
  const days = Math.floor((now.getTime() - then) / dayMs)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} ago`
}
