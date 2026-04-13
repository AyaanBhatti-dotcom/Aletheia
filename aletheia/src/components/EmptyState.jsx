function EmptyState({ description, title }) {
  return (
    <div className="empty-state">
      <svg
        className="empty-state__illustration"
        viewBox="0 0 240 160"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="120" cy="80" r="52" fill="var(--color-accent)" opacity="0.45" />
        <circle cx="120" cy="80" r="28" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
        <path
          d="M84 112c14-12 27-18 36-18s22 6 36 18"
          fill="none"
          stroke="var(--color-primary-light)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M108 72c4-7 8-11 12-11s8 4 12 11"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p style={{ margin: 0 }}>{description}</p>
    </div>
  )
}

export default EmptyState
