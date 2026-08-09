import { Link } from '@tanstack/react-router'

export type Tab = {
  key: string
  label: string
  to: string
  search: Record<string, unknown>
}

type Props = {
  tabs: Tab[]
  activeKey: string
}

export function Tabs({ tabs, activeKey }: Props) {
  return (
    <nav className="tabs" aria-label="sort">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          to={tab.to}
          search={tab.search as never}
          aria-current={tab.key === activeKey ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
