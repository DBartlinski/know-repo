import { useState } from 'react'

export default function QueryInput({ onSearch, isSearching }) {
  const [localQuery, setLocalQuery] = useState("")

  function handleChange(e) {
    const newQuery = e.target.value
    setLocalQuery(newQuery)
    onSearch(newQuery)  // Dynamic search on every keystroke
  }

  return (
    <div className="query-section">
      <textarea
        value={localQuery}
        onChange={handleChange}
        onKeyDown={e => {
          if (e.ctrlKey && e.key === 'Enter') {
            onSearch(localQuery)
          }
        }}
        placeholder="Paste a media query, question, or key phrases here…

The app will find the most relevant documents in the library."
        disabled={isSearching}
        aria-label="Search query"
      />
      <div className="query-actions">
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
