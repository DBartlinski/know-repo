import React, { useState, useEffect } from 'react'
import './DocumentUpload.css'

export default function DocumentUpload({ apiBase, onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [metadata, setMetadata] = useState({
    title: '',
    topic: '',
    doc_type: '',
    created_by: ''
  })
  const [options, setOptions] = useState({ topics: [], document_types: [] })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('') // 'success' or 'error'
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    // Fetch available topics and document types
    fetch(`${apiBase}/api/metadata-options`)
      .then(r => r.json())
      .then(data => setOptions(data))
      .catch(e => console.error('Failed to load metadata options:', e))
  }, [apiBase])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      // Auto-fill filename as title if not set
      if (!metadata.title) {
        setMetadata({
          ...metadata,
          title: selectedFile.name.replace(/\.[^/.]+$/, '')
        })
      }
    }
  }

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file || !metadata.title || !metadata.topic || !metadata.doc_type) {
      setStatus('Please fill out all required fields')
      setStatusType('error')
      return
    }

    setLoading(true)
    setStatus('Uploading...')
    setStatusType('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', metadata.title)
    formData.append('topic', metadata.topic)
    formData.append('doc_type', metadata.doc_type)
    formData.append('created_by', metadata.created_by || 'User Upload')

    try {
      const response = await fetch(`${apiBase}/api/upload-document`, {
        method: 'POST',
        body: formData
      })
      const result = await response.json()
      
      if (response.ok && result.success) {
        setStatus(`✅ Document uploaded: ${result.filename}`)
        setStatusType('success')
        setFile(null)
        setMetadata({ title: '', topic: '', doc_type: '', created_by: '' })
        
        // Reset form visibility
        setTimeout(() => {
          setShowForm(false)
          setStatus('')
        }, 2000)
        
        // Call callback if provided
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } else {
        setStatus(`❌ ${result.detail || 'Upload failed'}`)
        setStatusType('error')
      }
    } catch (error) {
      setStatus(`❌ Upload failed: ${error.message}`)
      setStatusType('error')
    }
    
    setLoading(false)
  }

  return (
    <div className="document-upload">
      {!showForm ? (
        <button 
          className="btn-upload-toggle"
          onClick={() => setShowForm(true)}
          title="Upload a new document with metadata"
        >
          📄 Upload Document
        </button>
      ) : (
        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <h3>Upload New Document</h3>
            <button 
              type="button"
              className="btn-close"
              onClick={() => setShowForm(false)}
            >
              ✕
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="file-input">Document File *</label>
            <div className="file-input-wrapper">
              <input
                id="file-input"
                type="file"
                accept=".docx,.pdf,.xlsx"
                onChange={handleFileChange}
                disabled={loading}
              />
              <span className="file-name">
                {file ? file.name : 'Choose file (.docx, .pdf, .xlsx)'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="title-input">Document Title *</label>
            <input
              id="title-input"
              type="text"
              placeholder="Enter document title"
              value={metadata.title}
              onChange={(e) => handleMetadataChange('title', e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="topic-select">Topic *</label>
            <select
              id="topic-select"
              value={metadata.topic}
              onChange={(e) => handleMetadataChange('topic', e.target.value)}
              disabled={loading}
              required
            >
              <option value="">Select a topic...</option>
              {options.topics && options.topics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="type-select">Document Type *</label>
            <select
              id="type-select"
              value={metadata.doc_type}
              onChange={(e) => handleMetadataChange('doc_type', e.target.value)}
              disabled={loading}
              required
            >
              <option value="">Select a document type...</option>
              {options.document_types && options.document_types.map(dt => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="author-input">Author/Creator (optional)</label>
            <input
              id="author-input"
              type="text"
              placeholder="Your name or department"
              value={metadata.created_by}
              onChange={(e) => handleMetadataChange('created_by', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              disabled={loading || !file}
              className="btn-submit"
            >
              {loading ? '⏳ Uploading...' : '📤 Upload Document'}
            </button>
            <button 
              type="button"
              onClick={() => setShowForm(false)}
              disabled={loading}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>

          {status && (
            <div className={`status-message ${statusType}`}>
              {status}
            </div>
          )}
        </form>
      )}
    </div>
  )
}
