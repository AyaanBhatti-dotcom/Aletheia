function LoadingSpinner() {
  return (
    <div className="loading-state" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p style={{ margin: 0 }}>Loading your local data...</p>
    </div>
  )
}

export default LoadingSpinner
