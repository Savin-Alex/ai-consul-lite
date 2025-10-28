/**
 * Reply Panel Component for AI Consul Lite
 * Main UI component with tone selector and suggestion display
 */

import React, { useState, useEffect } from 'react'

/**
 * Reply Panel component
 */
function ReplyPanel({ onGenerate, onClose, onInsert }) {
  const [selectedTone, setSelectedTone] = useState('semi-formal')
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Load default tone from storage on mount
  useEffect(() => {
    loadDefaultTone()
  }, [])

  const loadDefaultTone = async () => {
    try {
      const result = await chrome.storage.sync.get('defaultTone')
      if (result.defaultTone) {
        setSelectedTone(result.defaultTone)
      }
    } catch (error) {
      console.error('Failed to load default tone:', error)
    }
  }

  const saveDefaultTone = async (tone) => {
    try {
      await chrome.storage.sync.set({ defaultTone: tone })
    } catch (error) {
      console.error('Failed to save default tone:', error)
    }
  }

  const handleToneChange = (event) => {
    const tone = event.target.value
    setSelectedTone(tone)
    saveDefaultTone(tone)
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    setError('')
    setSuggestions([])

    try {
      const newSuggestions = await onGenerate(selectedTone)
      setSuggestions(newSuggestions || [])
    } catch (error) {
      setError(error.message || 'Failed to generate suggestions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const handleInsert = (text) => {
    // Call the insert function passed from content script
    if (onInsert) {
      onInsert(text)
    }
  }

  return (
    <div className="reply-panel">
      <div className="panel-header">
        <h3>AI Consul Lite</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div className="tone-selector">
          <label htmlFor="tone-select">Tone:</label>
          <select 
            id="tone-select" 
            value={selectedTone} 
            onChange={handleToneChange}
            disabled={isLoading}
          >
            <option value="formal">Formal</option>
            <option value="semi-formal">Semi-formal</option>
            <option value="friendly">Friendly</option>
            <option value="slang">Slang</option>
          </select>
        </div>

        <button 
          className="generate-button" 
          onClick={handleGenerateStream}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Suggestions'}
        </button>

        {streamingProgress && (
          <div className="streaming-progress">
            <div className="streaming-text">{streamingProgress}</div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button 
              className="error-dismiss" 
              onClick={() => setError('')}
              title="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {isLoading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="suggestions">
            <h4>Suggestions:</h4>
            {suggestions.map((suggestion, index) => (
              <div key={index} className="suggestion-item">
                <div className="suggestion-text">{suggestion}</div>
                <div className="suggestion-actions">
                  <button 
                    className="action-button copy-button"
                    onClick={() => handleCopy(suggestion)}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                  <button 
                    className="action-button insert-button"
                    onClick={() => handleInsert(suggestion)}
                    title="Insert into chat"
                  >
                    ➤
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReplyPanel
