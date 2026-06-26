import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import Mark from 'mark.js'

// Use the bundled pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function PDFViewer({ url, queryTokens, inDocQuery, onHitsFound }) {
  const [numPages, setNumPages] = useState(null)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const markInstanceRef = useRef(null)
  const [scale] = useState(1.3)

  // Build the set of terms to highlight (query tokens + in-doc search term)
  const highlightTerms = [
    ...(queryTokens ?? []),
    ...(inDocQuery?.trim() ? [inDocQuery.trim()] : []),
  ].filter(Boolean)

  // After pages render, apply highlight marks using mark.js
  useEffect(() => {
    if (!containerRef.current || highlightTerms.length === 0) return

    // Small delay to allow PDF.js text layer to finish painting
    const timer = setTimeout(() => {
      if (!markInstanceRef.current) {
        markInstanceRef.current = new Mark(containerRef.current)
      }
      const mark = markInstanceRef.current
      mark.unmark()

      if (highlightTerms.length === 0) {
        onHitsFound?.(0, () => {})
        return
      }

      mark.mark(highlightTerms, {
        separateWordSearch: false,
        accuracy: 'exactly',
        caseSensitive: false,
        done: () => {
          const marks = containerRef.current.querySelectorAll('mark')
          onHitsFound?.(marks.length, (idx) => {
            marks[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            marks.forEach((m, i) => m.classList.toggle('pdf-current', i === idx))
          })
        },
      })
    }, 400)

    return () => clearTimeout(timer)
  }, [numPages, highlightTerms.join('|')])

  if (error) {
    return (
      <div className="preview-placeholder">
        <div className="icon">⚠️</div>
        <p>Failed to load PDF: {error}</p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer" ref={containerRef}>
      <style>{`
        .pdf-viewer mark {
          background: rgba(255, 224, 130, 0.7);
          border-radius: 2px;
          padding: 0 2px;
          color: inherit;
        }
        .pdf-viewer mark.pdf-current {
          background: rgba(255, 193, 7, 0.9);
          font-weight: bold;
        }
      `}</style>
      <div className="pdf-pages">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={e => setError(e.message)}
          loading={<div style={{ padding: 40, color: '#888' }}>Loading PDF…</div>}
        >
          {numPages && Array.from({ length: numPages }, (_, i) => (
            <div className="pdf-page-wrap" key={i}>
              <Page
                pageNumber={i + 1}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  )
}
