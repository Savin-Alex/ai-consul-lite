/**
 * Popup Entry Point for AI Consul Lite
 * Mounts React app to the popup
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import PopupPage from './popup.jsx'

// Mount React app
const container = document.getElementById('root')
if (!container) {
  console.error('Root container not found!')
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root container not found</div>'
} else {
  console.log('Root container found, mounting React...')
  const root = createRoot(container)
  root.render(React.createElement(PopupPage))
}
