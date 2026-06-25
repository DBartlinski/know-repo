import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

// Use the bundled pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function PDFViewer({ url, queryTokens, inDocQuery, onHitsFound }) {
  const [numPages, setNumPages] = useState(null)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const [scale] = useState(1.3)

  // Build the set of terms to highlight (query tokens + in-doc search term)
  const highlightTerms = [
    ...(queryTokens ?? []),
    ...(inDocQuery?.trim() ? [inDocQuery.trim().toLowerCase()] : []),
  ].filter(Boolean)

  // After pages render, apply highlight marks to the text layer
  useEffect(() => {
    if (!containerRef.current || highlightTerms.length === 0) return

    // Small delay to allow PDF.js text layer to finish painting
    const timer = setTimeout(() => {
      const spans = containerRef.current.querySelectorAll('.react-pdf__Page__textContent span')
      let hitCount = 0
      const hitEls = []

      spans.forEach(span => {
        const text = span.textContent || ''
        const lower = text.toLowerCase()
        const matched = highlightTerms.some(t => lower.includes(t))
        if (matched) {
          span.classList.add('pdf-highlight')
          hitCount++
          hitEls.push(span)
        } else {
          span.classList.remove('pdf-highlight')
        }
      })

      onHitsFound?.(hitCount, (idx) => {
        hitEls[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
        .react-pdf__Page__textContent span.pdf-highlight {
          background: rgba(255, 224, 130, 0.7);
          border-radius: 2px;
          mix-blend-mode: multiply;
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
