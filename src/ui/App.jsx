/**
 * Main App Component for AI Consul Lite UI
 */

import React, { useState, useEffect } from 'react'
import ReplyPanel from './ReplyPanel.jsx'
import './styles.css'

/**
 * Main App component
 */
function App({ onGenerate, onClose, onInsert }) {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = () => {
    setIsVisible(false)
    if (onClose) {
      onClose()
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="ai-consul-app">
      <ReplyPanel 
        onGenerate={onGenerate}
        onClose={handleClose}
        onInsert={onInsert}
      />
    </div>
  )
}

export default App
