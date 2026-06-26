import { useState, useRef, useEffect } from 'react'

export default function QueryInput({ onSearch, isSearching }) {
  const [localQuery, setLocalQuery] = useState("")
  const textareaRef = useRef(null)

  function handleChange(e) {
    const newQuery = e.target.value
    setLocalQuery(newQuery)
  }

  function handleSearch() {
    onSearch(localQuery)
  }

  return (
    <div className="query-section">
      <textarea
        ref={textareaRef}
        value={localQuery}
        onChange={handleChange}
        onKeyDown={e => {
          if (e.ctrlKey && e.key === 'Enter') {
            handleSearch()
          }
        }}
        placeholder="Paste a media query, question, or key phrases here…

The app will find the most relevant documents in the library."
        disabled={isSearching}
        aria-label="Search query"
        autoFocus
      />
      <div className="query-actions">
        <button
          className="btn-primary"
          onClick={handleSearch}
          disabled={isSearching || !localQuery.trim()}
        >
          {isSearching ? 'Searching…' : 'Search'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => setLocalQuery("")}
          disabled={!localQuery}
        >
          Clear
        </button>
        <span className="result-count">{localQuery.split(/\s+/).filter(w => w).length} words</span>
      </div>
    </div>
  )
}
