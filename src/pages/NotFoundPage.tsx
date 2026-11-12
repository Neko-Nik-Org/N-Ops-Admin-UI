import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink text-center">
    <h1 className="font-mono text-sm text-text-muted">404</h1>
    <p className="text-text">This page doesn't exist.</p>
    <Link to="/" className="text-sm text-signal hover:text-signal-strong">
      Back to N-Ops
    </Link>
  </div>
)
