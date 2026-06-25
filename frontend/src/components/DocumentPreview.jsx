import { useState, useCallback } from 'react'
import PDFViewer from './PDFViewer'
import DocxViewer from './DocxViewer'
import XlsViewer from './XlsViewer'

export default function DocumentPreview({ doc, queryTokens, apiBase }) {
  const [inDocQuery, setInDocQuery] = useState('')
  const [hitCount, setHitCount] = useState(0)
  const [currentHit, setCurrentHit] = useState(0)
  const [navigateFn, setNavigateFn] = useState(null)   // callback from child viewers

  // When the selected doc changes, clear the in-doc search state
  const handleDocChange = useCallback(() => {
    setInDocQuery('')
    setHitCount(0)
    setCurrentHit(0)
    setNavigateFn(null)
  }, [])

  const handleHitsFound = useCallback((count, navFn) => {
    setHitCount(count)
    setCurrentHit(count > 0 ? 1 : 0)
    setNavigateFn(() => navFn)   // wrap in function so React doesn't call it
  }, [])

  function navigate(direction) {
    const next = direction === 'next'
      ? (currentHit % hitCount) + 1
      : ((currentHit - 2 + hitCount) % hitCount) + 1
    setCurrentHit(next)
    navigateFn?.(next - 1)  // 0-indexed
  }

  if (!doc) {
    return (
      <div className="preview-placeholder">
        <div className="icon">📂</div>
        <p>Select a document from the results list to preview it here.</p>
      </div>
    )
  }

  const previewUrl = `${apiBase}/api/preview/${doc.id}`
  const ft = doc.filetype?.toLowerCase()

  function renderViewer() {
    if (ft === 'pdf') {
      return (
        <PDFViewer
          url={previewUrl}
          queryTokens={queryTokens}
          inDocQuery={inDocQuery}
          onHitsFound={handleHitsFound}
          key={doc.id}
        />
      )
    }
    if (ft === 'docx' || ft === 'doc') {
      return (
        <DocxViewer
          url={previewUrl}
          queryTokens={queryTokens}
          inDocQuery={inDocQuery}
          onHitsFound={handleHitsFound}
          key={doc.id}
        />
      )
    }
    if (ft === 'xlsx' || ft === 'xls') {
      return (
        <XlsViewer
          url={previewUrl}
          queryTokens={queryTokens}
          inDocQuery={inDocQuery}
          onHitsFound={handleHitsFound}
          key={doc.id}
        />
      )
    }
    return (
      <div className="preview-placeholder">
        <div className="icon">❓</div>
        <p>Preview not available for .{ft} files.</p>
        <a href={previewUrl} download={doc.filename}>Download file</a>
      </div>
    )
  }

  return (
    <>
      <div className="preview-header">
        <span className="preview-title" title={doc.filename}>{doc.title || doc.filename}</span>
        <div className="in-doc-search">
          <input
            type="text"
            placeholder="Search in document…"
            value={inDocQuery}
            onChange={e => {
              setInDocQuery(e.target.value)
              setCurrentHit(0)
            }}
            aria-label="Search within document"
          />
          {hitCount > 0 && (
            <>
              <span className="hit-counter">{currentHit}/{hitCount}</span>
              <button className="nav-btn" onClick={() => navigate('prev')} aria-label="Previous hit">▲</button>
              <button className="nav-btn" onClick={() => navigate('next')} aria-label="Next hit">▼</button>
            </>
          )}
          {inDocQuery && hitCount === 0 && (
            <span className="hit-counter" style={{ color: '#c0392b' }}>0 hits</span>
          )}
        </div>
        <a
          href={previewUrl}
          download={doc.filename}
          className="btn-secondary"
          style={{ textDecoration: 'none', marginLeft: 8 }}
        >
          ⬇ Download
        </a>
      </div>
      <div className="preview-body">
        {renderViewer()}
      </div>
    </>
  )
}
