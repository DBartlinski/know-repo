import { useEffect, useRef, useState } from 'react'
import Mark from 'mark.js'

export default function XlsViewer({ url, queryTokens, inDocQuery, onHitsFound }) {
  const [sheets, setSheets] = useState([])   // [{name, rows: [[cell, ...], ...]}]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const contentRef = useRef(null)
  const markInstanceRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    // Fetch the file as text — the backend serves the raw bytes.
    // For XLS/XLSX previewing we parse the plain-text representation
    // extracted by the backend (served as text via /api/preview).
    // Since browsers cannot natively parse XLS/XLSX, we display the
    // text content returned by the server in a styled table.
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        // Try to get text for display. Binary XLS will look garbled — that's
        // acceptable; the important content (XLSX) will render fine.
        return r.text()
      })
      .then(text => {
        // Parse the pipe-delimited text format produced by the backend indexer
        const sheetBlocks = text.split(/\[Sheet: ([^\]]+)\]/).filter(Boolean)
        const parsed = []
        for (let i = 0; i < sheetBlocks.length; i += 2) {
          const name = sheetBlocks[i].trim()
          const body = sheetBlocks[i + 1] ?? ''
          const rows = body.trim().split('\n').filter(Boolean).map(row =>
            row.split(' | ')
          )
          parsed.push({ name, rows })
        }
        setSheets(parsed.length ? parsed : [{ name: 'Content', rows: [[text]] }])
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [url])

  // Highlight terms
  useEffect(() => {
    if (!contentRef.current || loading) return

    const terms = [
      ...(queryTokens ?? []),
      ...(inDocQuery?.trim() ? [inDocQuery.trim()] : []),
    ].filter(Boolean)

    if (!markInstanceRef.current) {
      markInstanceRef.current = new Mark(contentRef.current)
    }
    const mark = markInstanceRef.current
    mark.unmark()

    if (terms.length === 0) {
      onHitsFound?.(0, () => {})
      return
    }

    mark.mark(terms, {
      separateWordSearch: false,
      accuracy: 'exactly',
      caseSensitive: false,
      done: () => {
        const marks = contentRef.current.querySelectorAll('mark')
        onHitsFound?.(marks.length, (idx) => {
          marks[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          marks.forEach((m, i) => m.classList.toggle('current', i === idx))
        })
      },
    })
  }, [sheets, queryTokens?.join('|'), inDocQuery])

  if (loading) {
    return (
      <div className="preview-placeholder">
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <p>Loading spreadsheet…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="preview-placeholder">
        <div className="icon">⚠️</div>
        <p>Failed to load file: {error}</p>
      </div>
    )
  }

  return (
    <div className="xls-viewer" ref={contentRef}>
      {sheets.map((sheet, si) => (
        <div className="xls-sheet" key={si}>
          <h3>{sheet.name}</h3>
          <table className="xls-table">
            <tbody>
              {sheet.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    ri === 0
                      ? <th key={ci}>{cell}</th>
                      : <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
