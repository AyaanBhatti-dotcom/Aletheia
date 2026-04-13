function EmptyState({ description, title }) {
  return (
    <div className="empty-state">
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="40" cy="40" r="36" fill="var(--color-accent)" />
        <circle cx="40" cy="40" r="20" fill="var(--color-accent-mid)" />
        <circle cx="40" cy="40" r="8" fill="var(--color-primary-light)" opacity="0.6" />
        <path
          d="M28 54c4-6 7-9 12-9s8 3 12 9"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="33" cy="36" r="2.5" fill="var(--color-primary)" opacity="0.6" />
        <circle cx="47" cy="36" r="2.5" fill="var(--color-primary)" opacity="0.6" />
      </svg>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__desc">{description}</p>
    </div>
  )
}

export default EmptyState
