function ErrorState({
  actionLabel = 'Try again',
  description = 'Something went wrong loading your data. Please try again.',
  onAction = () => window.location.reload(),
  title = 'We could not load your journal right now',
}) {
  return (
    <div className="card" style={{ display: 'grid', gap: '14px', width: '100%', maxWidth: '640px', marginInline: 'auto' }}>
      <div style={{ display: 'grid', gap: '8px' }}>
        <span className="privacy-badge" style={{ width: 'fit-content' }}>
          Loading problem
        </span>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>{description}</p>
      </div>

      <button type="button" className="btn-primary" style={{ width: 'fit-content' }} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}

export default ErrorState
