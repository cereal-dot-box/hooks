import { Fragment } from 'react'

import {
  EVENT_INFO,
  PRIMARY_EVENT_IDS,
  SECONDARY_EVENT_IDS,
  type EventId,
} from '#/lib/events'

type CommonProps = {
  /** Events the package hooks into (lit on the rail). */
  events?: EventId[]
}

type DetailProps = CommonProps & {
  variant: 'detail'
}

type FilterProps = CommonProps & {
  variant: 'filter'
  /** Currently selected event, or 'all' for none. */
  activeEvent: EventId | 'all'
  /** Fired when an event is clicked. Toggling the active event yields 'all'. */
  onSelect: (event: EventId | 'all') => void
  /** Package counts per event, for the count badges. */
  counts: Record<EventId, number>
}

type Props = DetailProps | FilterProps

export function LifecycleSpine(props: Props) {
  if (props.variant === 'filter') {
    return <FilterSpine {...props} />
  }
  return <DetailSpine {...props} />
}

function DetailSpine({ events = [] }: DetailProps) {
  const lit = new Set(events)
  return (
    <div className="spine-hero">
      {PRIMARY_EVENT_IDS.map((event) => (
        <div
          key={event}
          className="spine-hero__event"
          data-active={lit.has(event)}
          title={EVENT_INFO[event].fires}
        >
          <span className="spine-hero__dot" />
          <span className="spine-hero__name">{event}</span>
        </div>
      ))}
    </div>
  )
}

function FilterSpine({
  events = [],
  activeEvent,
  onSelect,
  counts,
}: FilterProps) {
  const lit = new Set(events)
  const onClick = (event: EventId) => {
    onSelect(activeEvent === event ? 'all' : event)
  }

  return (
    <>
      <div className="spine-hero">
        {PRIMARY_EVENT_IDS.map((event, i) => (
          <Fragment key={event}>
            {i > 0 && (
              <div className="spine-hero__arrow" aria-hidden="true">
                ↓
              </div>
            )}
            <button
              type="button"
              className="spine-hero__event"
              data-active={activeEvent === event}
              data-lit={lit.has(event)}
              title={EVENT_INFO[event].fires}
              onClick={() => onClick(event)}
            >
              <span className="spine-hero__dot" />
              <span className="spine-hero__name">{event}</span>
              <span className="spine-hero__count">{counts[event] ?? 0}</span>
            </button>
          </Fragment>
        ))}
      </div>
      <p className="spine-also">
        <span className="spine-also__head">
          <span className="spine-also__label">agent-specific</span>
        </span>
        {SECONDARY_EVENT_IDS.map((event) => (
          <button
            key={event}
            type="button"
            className="spine-also__item"
            data-active={activeEvent === event}
            data-lit={lit.has(event)}
            title={EVENT_INFO[event].fires}
            onClick={() => onClick(event)}
          >
            <span className="spine-also__dot" />
            {event}
            <span className="spine-also__count">{counts[event] ?? 0}</span>
          </button>
        ))}
      </p>
    </>
  )
}
