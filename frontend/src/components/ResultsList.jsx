const FILE_ICONS = {
  pdf:  '📄',
  docx: '📝',
  doc:  '📝',
  xlsx: '📊',
  xls:  '📊',
}

function fmt_size(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function ResultsList({ results, selectedId, onSelect }) {
  if (results.length === 0) {
    return (
      <div className="results-list">
        <div className="results-empty">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <p>No results yet.<br />Paste a query and click <strong>Search Documents</strong>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="results-list">
      {results.map((doc) => (
        <div
          key={doc.id}
          className={`result-item${doc.id === selectedId ? ' active' : ''}`}
          onClick={() => onSelect(doc)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onSelect(doc)}
          aria-selected={doc.id === selectedId}
        >
          <div className="result-header">
            <span className="file-icon">
              {FILE_ICONS[doc.filetype] ?? '📁'}
            </span>
            <span className="result-title" title={doc.title || doc.filename}>
              {doc.title || doc.filename}
            </span>
            <span className="result-score" title="Relevance score">
              {doc.score.toFixed(2)}
            </span>
          </div>
          <div className="result-meta">
            {doc.filetype.toUpperCase()}
            {doc.author ? ` · ${doc.author}` : ''}
            {doc.filesize ? ` · ${fmt_size(doc.filesize)}` : ''}
          </div>
          {doc.snippet && (
            <div className="result-snippet">
              {doc.snippet}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
