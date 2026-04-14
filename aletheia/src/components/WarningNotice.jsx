function WarningNotice({ warnings }) {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    return null
  }

  return (
    <div className="card" style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
      <p style={{ marginBottom: warnings.length > 1 ? '10px' : 0 }}>
        {warnings.length === 1
          ? warnings[0]
          : `${warnings.length} records or actions need your attention:`}
      </p>
      {warnings.length > 1 && (
        <ul style={{ margin: 0, paddingLeft: '18px', fontWeight: 500 }}>
          {warnings.map((warning, index) => (
            <li key={`${warning}-${index}`}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default WarningNotice
