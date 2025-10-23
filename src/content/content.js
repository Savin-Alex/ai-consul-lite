/**
 * Content Script for AI Consul Lite
 * Handles chat detection, UI injection, and context scraping
 */

import { getAdapter, getRecentMessages, hasChatInterface } from '../lib/platform_adapter.js'
import { mountReplyPanel } from '../ui/index.jsx'

// State management
let isExtensionActive = false
let currentAdapter = null
let aiIcon = null
let replyPanel = null

/**
 * Initialize the content script
 */
async function initialize() {
  // Check if extension is enabled
  const extensionEnabled = await chrome.storage.sync.get('extensionEnabled')
  if (extensionEnabled.extensionEnabled === false) {
    return
  }

  // Check if extension is disabled for this site
  const hostname = window.location.hostname
  const siteStates = await chrome.storage.sync.get('siteStates')
  const siteEnabled = siteStates.siteStates?.[hostname] !== false

  if (!siteEnabled) {
    return
  }

  // Get platform adapter
  currentAdapter = getAdapter(hostname)
  if (!currentAdapter) {
    return
  }

  isExtensionActive = true
  console.log(`AI Consul Lite active on ${currentAdapter.name}`)

  // Start monitoring for chat interface
  monitorForChatInterface()
}

/**
 * Monitor for chat interface using MutationObserver
 */
function monitorForChatInterface() {
  const observer = new MutationObserver((mutations) => {
    if (!isExtensionActive) return

    const inputField = document.querySelector(currentAdapter.inputSelector)
    if (inputField && !aiIcon) {
      injectAIIcon(inputField)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

/**
 * Inject AI icon next to the chat input
 */
function injectAIIcon(inputField) {
  if (aiIcon) return

  // Create AI icon
  aiIcon = document.createElement('div')
  aiIcon.id = 'ai-consul-icon'
  aiIcon.innerHTML = '🤖'
  aiIcon.style.cssText = `
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    cursor: pointer;
    z-index: 10000;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #4688F1;
    border-radius: 50%;
    color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
  `

  // Add hover effect
  aiIcon.addEventListener('mouseenter', () => {
    aiIcon.style.transform = 'translateY(-50%) scale(1.1)'
    aiIcon.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
  })

  aiIcon.addEventListener('mouseleave', () => {
    aiIcon.style.transform = 'translateY(-50%) scale(1)'
    aiIcon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
  })

  // Add click handler
  aiIcon.addEventListener('click', () => {
    toggleReplyPanel()
  })

  // Position relative to input field
  const inputContainer = inputField.closest('[data-testid="conversation-compose-box-input"]') || 
                        inputField.closest('.input-message-container') ||
                        inputField.closest('[data-qa="message_input"]') ||
                        inputField.parentElement

  if (inputContainer) {
    inputContainer.style.position = 'relative'
    inputContainer.appendChild(aiIcon)
  }
}

/**
 * Toggle reply panel visibility
 */
function toggleReplyPanel() {
  if (replyPanel) {
    // Close existing panel
    replyPanel.remove()
    replyPanel = null
    return
  }

  // Create Shadow DOM container positioned near the input field
  const shadowHost = document.createElement('div')
  shadowHost.id = 'ai-consul-panel'
  
  // Position near the input field instead of center screen
  const inputField = document.querySelector(currentAdapter.inputSelector)
  const inputRect = inputField ? inputField.getBoundingClientRect() : null
  
  let topPosition = '50%'
  let leftPosition = '50%'
  let transform = 'translate(-50%, -50%)'
  
  if (inputRect) {
    // Position above the input field
    const panelHeight = 400
    const spaceAbove = inputRect.top
    const spaceBelow = window.innerHeight - inputRect.bottom
    
    if (spaceAbove > panelHeight + 20) {
      // Position above input
      topPosition = `${Math.max(20, inputRect.top - panelHeight - 10)}px`
      leftPosition = `${Math.max(20, Math.min(window.innerWidth - 420, inputRect.left))}px`
      transform = 'none'
    } else if (spaceBelow > panelHeight + 20) {
      // Position below input
      topPosition = `${inputRect.bottom + 10}px`
      leftPosition = `${Math.max(20, Math.min(window.innerWidth - 420, inputRect.left))}px`
      transform = 'none'
    }
    // If neither above nor below has space, fall back to center positioning
  }
  
  shadowHost.style.cssText = `
    position: fixed;
    top: ${topPosition};
    left: ${leftPosition};
    transform: ${transform};
    z-index: 10001;
    width: 400px;
    max-height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    border: 1px solid #e0e0e0;
  `

  // Create shadow root
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' })

  // Mount React UI
  replyPanel = shadowRoot
  mountReplyPanel(shadowRoot, {
    onGenerate: handleGenerateSuggestions,
    onClose: () => {
      if (replyPanel) {
        replyPanel.remove()
        replyPanel = null
      }
    },
    onInsert: insertText
  })

  // Add to page
  document.body.appendChild(shadowHost)

  // Add click outside to close (no backdrop)
  const handleClickOutside = (event) => {
    if (replyPanel && !shadowHost.contains(event.target)) {
      replyPanel.remove()
      replyPanel = null
      document.removeEventListener('click', handleClickOutside)
    }
  }
  
  // Add listener after a short delay to prevent immediate closure
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 100)
}

/**
 * Handle suggestion generation
 */
async function handleGenerateSuggestions(tone) {
  try {
    // Get recent messages
    const messages = getRecentMessages(currentAdapter, 5)
    
    if (messages.length === 0) {
      throw new Error('No recent messages found')
    }

    // Get default provider
    const providerResult = await chrome.storage.sync.get('defaultProvider')
    const provider = providerResult.defaultProvider || 'openai'

    // Send request to background script
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SUGGESTIONS',
      context: messages,
      tone: tone,
      provider: provider
    })

    if (response.success) {
      return response.suggestions
    } else {
      throw new Error(response.error)
    }
  } catch (error) {
    console.error('Error generating suggestions:', error)
    throw error
  }
}

/**
 * Insert text into the chat input
 */
function insertText(text) {
  if (currentAdapter && currentAdapter.insertText) {
    currentAdapter.insertText(text)
  }
}

// Listen for storage changes to update state
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.extensionEnabled) {
      if (changes.extensionEnabled.newValue === false) {
        cleanup()
      } else {
        initialize()
      }
    }

    if (changes.siteStates) {
      const hostname = window.location.hostname
      const siteEnabled = changes.siteStates.newValue?.[hostname] !== false
      
      if (!siteEnabled) {
        cleanup()
      } else {
        initialize()
      }
    }
  }
})

/**
 * Cleanup function
 */
function cleanup() {
  isExtensionActive = false
  
  if (aiIcon) {
    aiIcon.remove()
    aiIcon = null
  }
  
  if (replyPanel) {
    replyPanel.remove()
    replyPanel = null
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}
