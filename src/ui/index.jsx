/**
 * UI Entry Point for AI Consul Lite
 * Handles Shadow DOM mounting and React app initialization
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import styles from './styles.css?inline'

/**
 * Mount the reply panel into a Shadow DOM root
 * @param {ShadowRoot} shadowRoot - The shadow root to mount into
 * @param {Object} callbacks - Callback functions for UI interactions
 * @returns {Object} React root instance
 */
export function mountReplyPanel(shadowRoot, callbacks) {
  // Inject CSS into Shadow DOM
  const styleTag = document.createElement('style')
  styleTag.textContent = styles
  shadowRoot.appendChild(styleTag)

  // Create container div
  const container = document.createElement('div')
  container.id = 'ai-consul-container'
  shadowRoot.appendChild(container)

  // Mount React app
  const root = createRoot(container)
  root.render(React.createElement(App, callbacks))

  return root
}

/**
 * Unmount the reply panel
 * @param {Object} root - React root instance
 */
export function unmountReplyPanel(root) {
  if (root) {
    root.unmount()
    // Clean up style tag if it exists
    const shadowRoot = root._internalRoot?.containerInfo?.host?.shadowRoot
    if (shadowRoot) {
      const styleTag = shadowRoot.querySelector('style')
      if (styleTag) {
        shadowRoot.removeChild(styleTag)
      }
    }
  }
}
