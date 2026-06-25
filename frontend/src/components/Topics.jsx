import { useEffect, useState } from 'react'

export default function Topics({ apiBase, selectedTopic, onSelectTopic, selectedDocType }) {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    // Build query string with doc_type_filter if selected
    const queryParam = selectedDocType ? `?doc_type_filter=${encodeURIComponent(selectedDocType)}` : ''
    fetch(`${apiBase}/api/topics${queryParam}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setTopics(data.topics || [])
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [apiBase, selectedDocType])  // Refetch when selectedDocType changes

  if (error) {
    return (
      <div className="topics-panel">
        <div style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
          Error loading topics
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="topics-panel">
        <div style={{ padding: '10px', color: '#999', fontSize: '12px' }}>
          <span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />
          Loading topics…
        </div>
      </div>
    )
  }

  return (
    <div className="topics-panel">
      <div className="topics-header">Categories</div>
      {topics.length === 0 ? (
        <div className="topics-empty">No categories found</div>
      ) : (
        <div className="topics-list">
          <button
            className={`topic-pill${!selectedTopic ? ' active' : ''}`}
            onClick={() => onSelectTopic(null)}
            title={`${topics.reduce((sum, t) => sum + t.count, 0)} total documents`}
          >
            All ({topics.reduce((sum, t) => sum + t.count, 0)})
          </button>
          {topics.map(topic => (
            <button
              key={topic.name}
              className={`topic-pill${selectedTopic === topic.name ? ' active' : ''}`}
              onClick={() => onSelectTopic(selectedTopic === topic.name ? null : topic.name)}
              title={`${topic.count} document${topic.count !== 1 ? 's' : ''}`}
            >
              {topic.name} <span className="count">({topic.count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
