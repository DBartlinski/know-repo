import { useState, useEffect } from "react"
import "./App.css"
import QueryInput from "./components/QueryInput"
import ResultsList from "./components/ResultsList"
import DocumentPreview from "./components/DocumentPreview"
import Topics from "./components/Topics"
import DocumentTypes from "./components/DocumentTypes"
import DocumentUpload from "./components/DocumentUpload"

const API = "http://localhost:8000"

export default function App() {
  const [results, setResults] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [queryTokens, setQueryTokens] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [statusMsg, setStatusMsg] = useState("Ready — paste a query or click filters")
  const [lastIndexed, setLastIndexed] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [selectedDocType, setSelectedDocType] = useState(null)
  const [query, setQuery] = useState("")

  // Trigger search only when filters (pills) change, not on query text changes
  useEffect(() => {
    doSearch(query, selectedTopic, selectedDocType)
  }, [selectedTopic, selectedDocType])

  async function doSearch(queryParam, topicParam, docTypeParam) {
    // Don't search if there's no query AND no filters
    if (!queryParam.trim() && !topicParam && !docTypeParam) {
      setResults([])
      setStatusMsg("Ready — paste a query or click filters")
      return
    }

    setIsSearching(true)
    setStatusMsg("Searching\u2026")
    setSelectedDoc(null)
    try {
      const res = await fetch(`${API}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryParam.trim(),
          topic_filter: topicParam,
          doc_type_filter: docTypeParam,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResults(data.results)
      setQueryTokens(data.results[0]?.query_tokens ?? [])
      setStatusMsg(`Found ${data.total} document${data.total !== 1 ? "s" : ""}`)
    } catch (e) {
      setStatusMsg(`Search error: ${e.message}`)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  function handleSearch(searchQuery) {
    setQuery(searchQuery)
    doSearch(searchQuery, selectedTopic, selectedDocType)
  }

  async function handleIndex() {
    setIsIndexing(true)
    setStatusMsg("Indexing documents\u2026")
    try {
      const res = await fetch(`${API}/api/index`, { method: "POST" })
      if (!res.ok) throw new Error(await res.text())
      setStatusMsg("Indexing started \u2014 this may take a moment")
      setTimeout(async () => {
        try {
          const s = await fetch(`${API}/api/status`).then(r => r.json())
          if (s.last_indexed) {
            setLastIndexed(s.last_indexed)
            setStatusMsg(`Index updated at ${new Date(s.last_indexed).toLocaleTimeString()}`)
          }
        } catch (_) {}
        setIsIndexing(false)
      }, 5000)
    } catch (e) {
      setStatusMsg(`Index error: ${e.message}`)
      setIsIndexing(false)
    }
  }

  async function handleExportCorrections() {
    try {
      const res = await fetch(`${API}/api/export-corrections`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      
      // Download CSV
      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(data.content))
      element.setAttribute('download', data.filename)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      
      setStatusMsg('✅ Document list exported as CSV')
    } catch (e) {
      setStatusMsg(`Export error: ${e.message}`)
    }
  }

  async function handleImportCorrections() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const csvContent = event.target.result
          const res = await fetch(`${API}/api/import-corrections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_content: csvContent })
          })
          if (!res.ok) throw new Error(await res.text())
          const result = await res.json()
          
          if (result.errors && result.errors.length > 0) {
            setStatusMsg(`✅ Imported ${result.updated} corrections (${result.errors.length} errors)`)
          } else {
            setStatusMsg(`✅ Imported ${result.updated} corrections`)
          }
        } catch (e) {
          setStatusMsg(`Import error: ${e.message}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="app">
      <div className="toolbar">
        <h1>PAO Document Search</h1>
        <span className="badge">Media Query Response Tool</span>
        <button
          className="btn-secondary"
          onClick={handleIndex}
          disabled={isIndexing}
          style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
        >
          {isIndexing ? <span className="spinner" /> : "\u27F3 Re-Index Library"}
        </button>
        <button
          className="btn-secondary"
          onClick={handleExportCorrections}
          style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
          title="Export documents to CSV for manual type correction"
        >
          📥 Export for Correction
        </button>
        <button
          className="btn-secondary"
          onClick={handleImportCorrections}
          style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
          title="Import corrected CSV file"
        >
          📤 Import Corrections
        </button>
        <DocumentUpload apiBase={API} onUploadSuccess={handleIndex} />
      </div>

      <div className="workspace">
        <div className="topics-sidebar">
          <Topics apiBase={API} selectedTopic={selectedTopic} onSelectTopic={setSelectedTopic} selectedDocType={selectedDocType} />
        </div>
        <div className="document-types-sidebar">
          <DocumentTypes apiBase={API} selectedDocType={selectedDocType} onSelectDocType={setSelectedDocType} selectedTopic={selectedTopic} />
        </div>
        <div className="left-panel">
          <QueryInput onSearch={handleSearch} isSearching={isSearching} />
          <ResultsList
            results={results}
            selectedId={selectedDoc?.id}
            onSelect={setSelectedDoc}
          />
        </div>
        <div className="right-panel">
          <DocumentPreview doc={selectedDoc} queryTokens={queryTokens} apiBase={API} />
        </div>
      </div>

      <div className="status-bar">
        <span>{statusMsg}</span>
        {lastIndexed && <span>Last indexed: {new Date(lastIndexed).toLocaleString()}</span>}
      </div>
    </div>
  )
}
