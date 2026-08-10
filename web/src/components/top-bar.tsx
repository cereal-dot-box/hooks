import { Link } from '@tanstack/react-router'

export function TopBar() {
  return (
    <nav className="topbar" aria-label="primary">
      <div className="topbar__inner">
        <Link to="/" className="topbar__brand">
          agenthooks
        </Link>
        <div className="topbar__nav">
          <Link to="/event/$event" params={{ event: 'PreToolUse' }}>
            events
          </Link>
          <Link to="/agent/$agent" params={{ agent: 'claude-code' }}>
            agents
          </Link>
          <Link to="/search">search</Link>
          <a href="https://github.com/jared-paul/agenthooks">github ↗</a>
        </div>
      </div>
    </nav>
  )
}
