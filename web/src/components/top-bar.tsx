import { Link } from '@tanstack/react-router'

export function TopBar() {
  return (
    <nav className="topbar" aria-label="primary">
      <Link to="/" className="topbar__brand">
        agenthooks<span className="topbar__brand-suffix">.directory</span>
      </Link>
      <div className="topbar__nav">
        <Link to="/search">search</Link>
        <a href="https://github.com/jared-paul/agenthooks">github ↗</a>
      </div>
    </nav>
  )
}
