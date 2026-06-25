import { useEffect, useState } from 'react'

export default function DocumentTypes({ apiBase, selectedDocType, onSelectDocType, selectedTopic }) {
  const [docTypes, setDocTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    // Build query string with topic_filter if selected
    const queryParam = selectedTopic ? `?topic_filter=${encodeURIComponent(selectedTopic)}` : ''
    fetch(`${apiBase}/api/document-types${queryParam}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setDocTypes(data.doc_types || [])
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [apiBase, selectedTopic])  // Refetch when selectedTopic changes

  if (error) {
    return (
      <div className="document-types-panel">
        <div style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
          Error loading document types
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="document-types-panel">
        <div style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
          <span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />
          Loading document types…
        </div>
      </div>
    )
  }

  return (
    <div className="document-types-panel">
      <div className="document-types-header">Document Type</div>
      {docTypes.length === 0 ? (
        <div className="document-types-empty">No document types found</div>
      ) : (
        <div className="document-types-list">
          <button
            className={`doc-type-pill${!selectedDocType ? ' active' : ''}`}
            onClick={() => onSelectDocType(null)}
            title={`${docTypes.reduce((sum, t) => sum + t.count, 0)} total documents`}
          >
            All ({docTypes.reduce((sum, t) => sum + t.count, 0)})
          </button>
          {docTypes.map(docType => (
            <button
              key={docType.name}
              className={`doc-type-pill${selectedDocType === docType.name ? ' active' : ''}`}
              onClick={() => onSelectDocType(selectedDocType === docType.name ? null : docType.name)}
              title={`${docType.count} document${docType.count !== 1 ? 's' : ''}`}
            >
              {docType.name} <span className="count">({docType.count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
