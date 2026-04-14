import { Link } from 'react-router-dom'

function LockedState({
  actionLabel = 'Open journal',
  description = 'Enter your passphrase in Settings to unlock your entries for this session.',
  title = 'Your journal is locked',
}) {
  return (
    <div className="card" style={{ display: 'grid', gap: '14px', width: '100%', maxWidth: '640px', marginInline: 'auto' }}>
      <div style={{ display: 'grid', gap: '8px' }}>
        <span className="privacy-badge" style={{ width: 'fit-content' }}>
          Locked journal
        </span>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>{description}</p>
      </div>

      <Link to="/settings" className="btn-primary" style={{ width: 'fit-content' }}>
        {actionLabel}
      </Link>
    </div>
  )
}

export default LockedState
