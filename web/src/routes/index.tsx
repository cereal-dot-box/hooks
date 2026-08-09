import { createFileRoute } from '@tanstack/react-router'
import { LifecycleSpine } from '#/components/lifecycle-spine'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main
      style={{
        maxWidth: 'var(--measure-wide)',
        margin: 'var(--space-7) auto',
        padding: '0 var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-7)',
      }}
    >
      <section>
        <h1>Spine preview</h1>
        <p style={{ color: 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: 'var(--step--1)' }}>
          temporary render to validate the lifecycle spine before wiring real routes
        </p>
      </section>

      <section>
        <h2>Preview — full set</h2>
        <LifecycleSpine
          events={['SessionStart', 'PreToolUse', 'Stop']}
          variant="preview"
        />
      </section>

      <section>
        <h2>Preview — single event</h2>
        <LifecycleSpine events={['PreToolUse']} variant="preview" />
      </section>

      <section>
        <h2>Detail — partial</h2>
        <LifecycleSpine
          events={['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreCompact']}
          variant="detail"
        />
      </section>

      <section>
        <h2>Detail — all lit</h2>
        <LifecycleSpine
          events={[
            'SessionStart',
            'UserPromptSubmit',
            'PreToolUse',
            'PostToolUse',
            'Notification',
            'SubagentStop',
            'Stop',
            'SessionEnd',
            'PreCompact',
          ]}
          variant="detail"
        />
      </section>
    </main>
  )
}
