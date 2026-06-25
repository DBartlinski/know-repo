import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth'
import Mark from 'mark.js'

export default function DocxViewer({ url, queryTokens, inDocQuery, onHitsFound }) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const contentRef = useRef(null)
  const markInstanceRef = useRef(null)

  // Fetch and convert DOCX → HTML via mammoth
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.arrayBuffer()
      })
      .then(buf => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then(result => {
        setHtml(result.value)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [url])

  // Apply highlight marks whenever HTML is ready or highlight terms change
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
  }, [html, queryTokens?.join('|'), inDocQuery])

  if (loading) {
    return (
      <div className="preview-placeholder">
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <p>Converting document…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="preview-placeholder">
        <div className="icon">⚠️</div>
        <p>Failed to load document: {error}</p>
      </div>
    )
  }

  return (
    <div
      className="docx-viewer"
      ref={contentRef}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
