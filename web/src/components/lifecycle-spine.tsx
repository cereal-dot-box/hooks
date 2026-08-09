import { HOOK_EVENTS, OFF_SPINE_EVENTS, type EventId } from '#/lib/events'

type Props = {
  events: EventId[]
  variant?: 'preview' | 'detail'
}

export function LifecycleSpine({ events, variant = 'preview' }: Props) {
  const lit = new Set(events)
  const offSpineLit = OFF_SPINE_EVENTS.some((e) => lit.has(e))

  return (
    <div className={`spine spine--${variant}`}>
      {variant === 'detail' && (
        <div className="spine__off-spine" data-lit={offSpineLit}>
          <span className="spine__off-spine-mark" />
          <span>PreCompact — fires off the timeline</span>
        </div>
      )}
      <ol
        className="spine__line"
        role="img"
        aria-label={
          events.length === 0
            ? 'No lifecycle events'
            : `Hooks into: ${events.join(', ')}`
        }
      >
        {HOOK_EVENTS.map((event) => (
          <li
            key={event}
            className="spine__event"
            data-lit={lit.has(event)}
            title={event}
          >
            <span className="spine__dot" />
            <span className="spine__label">{event}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
