import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'

import type { ReactNode } from 'react'

type Crumb = {
  node: ReactNode
  /** Trailing crumb — rendered as plain text in the current-page color. */
  current?: boolean
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      <Link to="/">@cerealbox/hooks</Link>
      {items.map((item, i) => (
        <Fragment key={i}>
          <span className="breadcrumb__sep">/</span>
          {item.current ? (
            <span className="breadcrumb__current">{item.node}</span>
          ) : (
            item.node
          )}
        </Fragment>
      ))}
    </nav>
  )
}
