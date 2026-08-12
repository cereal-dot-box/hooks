import { Link } from '@tanstack/react-router'

export function TopBar() {
  return (
    <nav className="topbar" aria-label="primary">
      <div className="topbar__inner">
        <Link to="/" className="topbar__brand">
          @cerealbox/hooks
        </Link>
        <div className="topbar__nav">
          <Link to="/" hash="most-installed">
            index
          </Link>
          <Link to="/search">search</Link>
          <a href="https://github.com/jared-paul/agenthooks">github ↗</a>
          <a href="https://cereal.box">cereal.box ↗</a>
        </div>
      </div>
    </nav>
  )
}
