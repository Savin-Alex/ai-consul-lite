/**
 * Simplified Content Script for AI Consul Lite
 * Handles chat detection, UI injection, and context scraping
 * No ES module imports - all functions inlined
 */

// Inlined platform adapter functions
function getAdapter(hostname) {
  const adapters = {
    'web.whatsapp.com': {
      name: 'WhatsApp',
      inputSelector: 'div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"]):not([aria-label*="search"])',
      messageSelector: 'div[class*="x1c4vz4f"]',
      getMessageText: (element) => {
        const textElement = element.querySelector('[data-testid="msg-container"] span[dir="ltr"]') ||
                           element.querySelector('span[dir="ltr"]') ||
                           element.querySelector('.selectable-text')
        return textElement ? textElement.textContent.trim() : ''
      },
      getMessageRole: (element) => {
        const isOutgoing = element.querySelector('[data-testid="msg-container"]')?.getAttribute('data-testid')?.includes('outgoing') ||
                          element.classList.toString().includes('outgoing')
        return isOutgoing ? 'user' : 'assistant'
      },
      insertText: (inputField, text) => {
        try {
          inputField.focus()
          inputField.innerHTML = ''
          
          const paragraph = document.createElement('p')
          paragraph.className = 'selectable-text copyable-text x15bjb6t x1n2onr6'
          paragraph.setAttribute('dir', 'ltr')
          paragraph.style.cssText = 'text-indent: 0px; margin-top: 0px; margin-bottom: 0px;'
          
          const span = document.createElement('span')
          span.className = 'selectable-text copyable-text xkrh14z'
          span.setAttribute('data-lexical-text', 'true')
          span.textContent = text
          
          paragraph.appendChild(span)
          inputField.appendChild(paragraph)
          
          inputField.dispatchEvent(new Event('input', { bubbles: true }))
          inputField.dispatchEvent(new Event('change', { bubbles: true }))
          inputField.dispatchEvent(new Event('keyup', { bubbles: true }))
          inputField.dispatchEvent(new Event('keydown', { bubbles: true }))
          
          return true
        } catch (error) {
          console.error('Error inserting text:', error)
          return false
        }
      }
    },
    'web.telegram.org': {
      name: 'Telegram',
      inputSelector: '.input-message-container [contenteditable="true"]',
      messageSelector: '.message',
      getMessageText: (element) => element.textContent.trim(),
      getMessageRole: (element) => element.classList.contains('message-out') ? 'user' : 'assistant',
      insertText: (inputField, text) => {
        inputField.textContent = text
        inputField.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      }
    },
    'app.slack.com': {
      name: 'Slack',
      inputSelector: '[data-qa="message_input"]',
      messageSelector: '[data-qa="message"]',
      getMessageText: (element) => element.textContent.trim(),
      getMessageRole: (element) => element.classList.contains('c-message--sent') ? 'user' : 'assistant',
      insertText: (inputField, text) => {
        inputField.value = text
        inputField.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      }
    }
  }
  
  return adapters[hostname] || null
}

function getRecentMessages(adapter, limit = 10) {
  const messages = []
  const messageElements = document.querySelectorAll(adapter.messageSelector)
  
  for (let i = Math.max(0, messageElements.length - limit); i < messageElements.length; i++) {
    const element = messageElements[i]
    const text = adapter.getMessageText(element)
    const role = adapter.getMessageRole(element)
    
    if (text) {
      messages.push({ text, role })
    }
  }
  
  return messages
}

function hasChatInterface(adapter) {
  return document.querySelector(adapter.inputSelector) !== null
}

// Inlined React UI mounting function (simplified)
function mountReplyPanel(shadowRoot, props) {
  const { onGenerate, onClose, onInsert } = props
  
  // Create a simple HTML structure instead of React
  const panelHTML = `
    <div style="
      width: 100%;
      height: 100%;
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #333; font-size: 18px;">AI Consul Lite</h3>
        <button id="close-btn" style="
          background: #f0f0f0;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>
      
      <!-- Live Transcript Section -->
      <div id="transcript-section" style="
        margin-bottom: 20px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        display: none;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="
            background: #4688F1;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            margin-right: 8px;
          ">🎤 LIVE</span>
          <span style="font-size: 12px; color: #666;">Voice Transcription</span>
        </div>
        <div id="transcript-text" style="
          font-size: 14px;
          line-height: 1.4;
          color: #333;
          min-height: 20px;
          font-style: italic;
          color: #666;
        ">No live transcription yet...</div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #555;">Tone:</label>
        <select id="tone-select" style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        ">
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <button id="generate-btn" style="
          width: 100%;
          padding: 12px;
          background: #4688F1;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">Generate Suggestions</button>
      </div>
      
      <div id="suggestions" style="
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #eee;
        border-radius: 6px;
        padding: 12px;
        background: #f9f9f9;
      ">
        <p style="margin: 0; color: #666; font-style: italic;">Click "Generate Suggestions" to get AI-powered replies</p>
      </div>
    </div>
  `
  
  shadowRoot.innerHTML = panelHTML
  
  // Add event listeners
  const closeBtn = shadowRoot.getElementById('close-btn')
  const generateBtn = shadowRoot.getElementById('generate-btn')
  const suggestionsDiv = shadowRoot.getElementById('suggestions')
  const transcriptSection = shadowRoot.getElementById('transcript-section')
  const transcriptText = shadowRoot.getElementById('transcript-text')
  
  closeBtn.addEventListener('click', () => {
    clearTranscriptUpdateCallback()
    onClose()
  })
  
  // Set up transcript update callback
  setTranscriptUpdateCallback((transcript) => {
    if (transcript && transcript.trim()) {
      transcriptSection.style.display = 'block'
      transcriptText.textContent = transcript
      transcriptText.style.fontStyle = 'normal'
      transcriptText.style.color = '#333'
    } else {
      transcriptSection.style.display = 'none'
    }
  })
  
  generateBtn.addEventListener('click', async () => {
    generateBtn.textContent = 'Generating...'
    generateBtn.disabled = true
    
    try {
      const suggestions = await onGenerate()
      suggestionsDiv.innerHTML = suggestions.map(suggestion => `
        <div style="
          margin-bottom: 12px;
          padding: 12px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          cursor: pointer;
        " data-suggestion="${suggestion}">
          <p style="margin: 0; font-size: 14px; line-height: 1.4;">${suggestion}</p>
        </div>
      `).join('')
      
      // Add click listeners to suggestions
      suggestionsDiv.querySelectorAll('[data-suggestion]').forEach(element => {
        element.addEventListener('click', () => {
          const suggestion = element.getAttribute('data-suggestion')
          onInsert(suggestion)
          onClose()
        })
      })
      
    } catch (error) {
      suggestionsDiv.innerHTML = `<p style="color: red; margin: 0;">Error: ${error.message}</p>`
    } finally {
      generateBtn.textContent = 'Generate Suggestions'
      generateBtn.disabled = false
    }
  })
}

// State management
let isExtensionActive = false
let currentAdapter = null
let aiIcon = null
let replyPanel = null

/**
 * Initialize the content script
 */
async function initialize() {
  console.log('🚀 AI Consul Lite Content Script Starting...')
  
  // Check if extension is enabled
  const extensionEnabled = await chrome.storage.sync.get('extensionEnabled')
  if (extensionEnabled.extensionEnabled === false) {
    console.log('⏸️ Extension disabled globally')
    return
  }

  // Check if extension is disabled for this site
  const hostname = window.location.hostname
  const siteStates = await chrome.storage.sync.get('siteStates')
  const siteEnabled = siteStates.siteStates?.[hostname] !== false

  if (!siteEnabled) {
    console.log('⏸️ Extension disabled for this site:', hostname)
    return
  }

  // Get platform adapter
  currentAdapter = getAdapter(hostname)
  if (!currentAdapter) {
    console.log('❌ No adapter found for hostname:', hostname)
    return
  }

  isExtensionActive = true
  console.log(`✅ AI Consul Lite active on ${currentAdapter.name}`)

  // Start monitoring for chat interface
  monitorForChatInterface()
}

/**
 * Monitor for chat interface using MutationObserver
 */
function monitorForChatInterface() {
  console.log('🔍 Starting monitorForChatInterface...')
  console.log('🎯 Looking for input selector:', currentAdapter.inputSelector)
  
  // First, try to find a more specific chat container to observe
  const chatContainer = findChatContainer()
  const observeTarget = chatContainer || document.body
  
  console.log('👀 Observing target:', observeTarget)
  console.log('📦 Chat container found:', chatContainer)
  
  const observer = new MutationObserver((mutationsList, observer) => {
    try {
      console.log('--- MUTATION OBSERVER CALLBACK FIRED ---')
      console.log('📊 Mutations detected:', mutationsList.length)
      console.log('🔍 Extension active?', isExtensionActive)
      
      if (!isExtensionActive) {
        console.log('⏸️ Extension not active, skipping...')
        return
      }
      
      console.log('👀 MutationObserver triggered, checking for input field...')
      console.log('🎯 Using selector:', currentAdapter.inputSelector)
      
      // Log selector results EVERY time
      const inputField = document.querySelector(currentAdapter.inputSelector)
      console.log('🔍 Primary selector result:', inputField)
      
      // Also check the specific WhatsApp selectors we know about
      const specificSelectors = [
        'div[data-testid="conversation-compose-box-input"]',
        '.lexical-rich-text-input[data-testid*="compose"]',
        'div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"]):not([aria-label*="search"])'
      ]
      
      for (const selector of specificSelectors) {
        const element = document.querySelector(selector)
        console.log(`🔍 Testing selector "${selector}":`, element)
        if (element) {
          console.log('📝 Element details:', {
            tagName: element.tagName,
            className: element.className,
            'data-testid': element.getAttribute('data-testid'),
            'aria-label': element.getAttribute('aria-label'),
            'aria-placeholder': element.getAttribute('aria-placeholder')
          })
        }
      }
      
      if (inputField) {
        console.log('✅ Input field found:', {
          element: inputField,
          tagName: inputField.tagName,
          className: inputField.className,
          'data-testid': inputField.getAttribute('data-testid'),
          'aria-label': inputField.getAttribute('aria-label'),
          'aria-placeholder': inputField.getAttribute('aria-placeholder')
        })
        
        // Additional validation to ensure this is a chat input, not search
        const isChatInput = validateChatInput(inputField)
        console.log('🎯 Is valid chat input?', isChatInput)
        
        if (isChatInput && !aiIcon) {
          console.log('🚀 Injecting AI icon...')
          injectAIIcon(inputField)
        } else if (!isChatInput) {
          console.log('❌ Input field found but not a valid chat input (likely search field)')
        } else {
          console.log('🔄 AI icon already exists, skipping injection')
        }
      } else {
        console.log('❌ No input field found with selector:', currentAdapter.inputSelector)
      }
      
      console.log('--- MUTATION OBSERVER CALLBACK COMPLETED ---')
      
    } catch (error) {
      console.error('❌ ERROR inside MutationObserver callback:', error)
      console.error('❌ Error stack:', error.stack)
    }
  })

  observer.observe(observeTarget, {
    childList: true,
    subtree: true
  })
  
  console.log('✅ MutationObserver started successfully')
  console.log('🎯 Observer target:', observeTarget)
  console.log('📊 Observer options:', { childList: true, subtree: true })
  
  // Store observer reference for debugging
  window.aiConsulObserver = observer
  console.log('🔗 Observer stored in window.aiConsulObserver for debugging')
  
  // Add manual inspection function for debugging
  window.aiConsulDebug = {
    checkSelectors: () => {
      console.log('🔍 Manual selector check:')
      const selectors = [
        'div[data-testid="conversation-compose-box-input"]',
        '.lexical-rich-text-input[data-testid*="compose"]',
        'div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"]):not([aria-label*="search"])',
        '.lexical-rich-text-input',
        '[contenteditable="true"]',
        '[role="textbox"]'
      ]
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        console.log(`📝 Selector "${selector}": ${elements.length} elements`)
        elements.forEach((el, i) => {
          console.log(`  Element ${i + 1}:`, {
            tagName: el.tagName,
            className: el.className,
            'data-testid': el.getAttribute('data-testid'),
            'aria-label': el.getAttribute('aria-label'),
            'aria-placeholder': el.getAttribute('aria-placeholder'),
            element: el
          })
        })
      })
    },
    
    checkObserver: () => {
      console.log('👀 Observer status:', {
        exists: !!window.aiConsulObserver,
        target: window.aiConsulObserver?.target,
        isActive: isExtensionActive,
        hasIcon: !!aiIcon,
        hasPanel: !!replyPanel
      })
    },
    
    forceCheck: () => {
      console.log('🔄 Force checking for input field...')
      const inputField = document.querySelector(currentAdapter.inputSelector)
      console.log('🎯 Force check result:', inputField)
      if (inputField) {
        console.log('🚀 Force injecting AI icon...')
        injectAIIcon(inputField)
      }
    }
  }
  
  console.log('🛠️ Debug functions available:')
  console.log('  - window.aiConsulDebug.checkSelectors() - Check all selectors')
  console.log('  - window.aiConsulDebug.checkObserver() - Check observer status')
  console.log('  - window.aiConsulDebug.forceCheck() - Force check and inject')
}

/**
 * Find a more specific chat container to observe
 */
function findChatContainer() {
  const selectors = [
    '[data-testid="conversation-panel-messages"]',
    '[data-testid="main"]',
    '[role="main"]',
    '.main',
    '#main',
    '[data-testid*="chat"]',
    '[data-testid*="conversation"]'
  ]
  
  for (const selector of selectors) {
    const container = document.querySelector(selector)
    if (container) {
      console.log('📦 Found chat container with selector:', selector, container)
      return container
    }
  }
  
  console.log('📦 No specific chat container found, will observe document.body')
  return null
}

/**
 * Validate that the input field is actually a chat input, not search
 */
function validateChatInput(inputField) {
  const ariaLabel = inputField.getAttribute('aria-label') || ''
  const ariaPlaceholder = inputField.getAttribute('aria-placeholder') || ''
  const placeholder = inputField.getAttribute('placeholder') || ''
  
  // Check for search-related attributes
  const isSearchField = ariaLabel.toLowerCase().includes('search') ||
                       ariaPlaceholder.toLowerCase().includes('search') ||
                       placeholder.toLowerCase().includes('search')
  
  // Check for message-related attributes
  const isMessageField = ariaLabel.toLowerCase().includes('message') ||
                        ariaLabel.toLowerCase().includes('type') ||
                        ariaPlaceholder.toLowerCase().includes('message') ||
                        ariaPlaceholder.toLowerCase().includes('type')
  
  console.log('🔍 Input field validation:', {
    ariaLabel,
    ariaPlaceholder,
    placeholder,
    isSearchField,
    isMessageField
  })
  
  return !isSearchField && (isMessageField || ariaLabel.includes('Type to'))
}

/**
 * Inject AI icon next to the chat input
 */
function injectAIIcon(inputField) {
  console.log('🚀 injectAIIcon called with inputField:', inputField)
  
  if (aiIcon) {
    console.log('🔄 AI icon already exists, skipping injection')
    return
  }

  console.log('🎨 Creating AI icon element...')
  
  // Create AI icon
  aiIcon = document.createElement('div')
  aiIcon.id = 'ai-consul-icon'
  aiIcon.innerHTML = '🤖'
  aiIcon.title = 'AI Consul Lite - Click to open'
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
    pointer-events: auto;
  `

  console.log('✅ AI icon element created:', aiIcon)

  // Add hover effect
  aiIcon.addEventListener('mouseenter', () => {
    console.log('🖱️ AI icon mouseenter')
    aiIcon.style.transform = 'translateY(-50%) scale(1.1)'
    aiIcon.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
  })

  aiIcon.addEventListener('mouseleave', () => {
    console.log('🖱️ AI icon mouseleave')
    aiIcon.style.transform = 'translateY(-50%) scale(1)'
    aiIcon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
  })

  // Add click handler with comprehensive debugging
  console.log('🔗 Adding click event listener...')
  aiIcon.addEventListener('click', (event) => {
    console.log('🤖 AI Icon Clicked!', event)
    console.log('🎯 Event details:', {
      type: event.type,
      target: event.target,
      currentTarget: event.currentTarget,
      bubbles: event.bubbles,
      cancelable: event.cancelable
    })
    
    try {
      toggleReplyPanel()
    } catch (error) {
      console.error('❌ Error in click handler:', error)
    }
  })
  
  console.log('✅ Click listener attached to AI icon')

  // Position relative to input field
  console.log('📍 Finding input container...')
  const inputContainer = inputField.closest('[data-testid="conversation-compose-box-input"]') || 
                        inputField.closest('.input-message-container') ||
                        inputField.closest('[data-qa="message_input"]') ||
                        inputField.parentElement

  console.log('📦 Input container found:', inputContainer)

  if (inputContainer) {
    inputContainer.style.position = 'relative'
    inputContainer.appendChild(aiIcon)
    console.log('✅ AI icon injected successfully into container:', inputContainer)
    console.log('🎯 Icon position:', {
      containerRect: inputContainer.getBoundingClientRect(),
      iconRect: aiIcon.getBoundingClientRect(),
      computedStyle: window.getComputedStyle(aiIcon)
    })
  } else {
    console.error('❌ No suitable input container found for AI icon')
  }
}

/**
 * Toggle reply panel visibility
 */
function toggleReplyPanel() {
  console.log('▶️ toggleReplyPanel started...')
  console.log('🔍 Current replyPanel state:', replyPanel)
  
  try {
    if (replyPanel) {
      console.log('🗑️ Closing existing panel...')
      // Close existing panel
      replyPanel.remove()
      replyPanel = null
      console.log('✅ Panel closed successfully')
      return
    }

    console.log('🏗️ Creating new reply panel...')
    
    // Create Shadow DOM container positioned near the input field
    const shadowHost = document.createElement('div')
    shadowHost.id = 'ai-consul-panel'
    console.log('📦 Shadow host created:', shadowHost)
    
    // Position near the input field instead of center screen
    const inputField = document.querySelector(currentAdapter.inputSelector)
    const inputRect = inputField ? inputField.getBoundingClientRect() : null
    
    console.log('📍 Input field for positioning:', inputField)
    console.log('📐 Input rect:', inputRect)
    
    let topPosition = '50%'
    let leftPosition = '50%'
    let transform = 'translate(-50%, -50%)'
    
    if (inputRect) {
      console.log('🎯 Calculating panel position...')
      // Position above the input field
      const panelHeight = 400
      const spaceAbove = inputRect.top
      const spaceBelow = window.innerHeight - inputRect.bottom
      
      console.log('📏 Space calculations:', {
        panelHeight,
        spaceAbove,
        spaceBelow,
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth
      })
      
      if (spaceAbove > panelHeight + 20) {
        // Position above input
        topPosition = `${Math.max(20, inputRect.top - panelHeight - 10)}px`
        leftPosition = `${Math.max(20, Math.min(window.innerWidth - 420, inputRect.left))}px`
        transform = 'none'
        console.log('⬆️ Positioning above input')
      } else if (spaceBelow > panelHeight + 20) {
        // Position below input
        topPosition = `${inputRect.bottom + 10}px`
        leftPosition = `${Math.max(20, Math.min(window.innerWidth - 420, inputRect.left))}px`
        transform = 'none'
        console.log('⬇️ Positioning below input')
      } else {
        console.log('🎯 Fallback to center positioning')
      }
      // If neither above nor below has space, fall back to center positioning
    } else {
      console.log('⚠️ No input field found for positioning, using center')
    }
    
    console.log('📍 Final position:', { topPosition, leftPosition, transform })
  
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
    
    console.log('🎨 Shadow host styles applied')

    // Create shadow root
    console.log('🌑 Creating shadow root...')
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
    console.log('✅ Shadow root created:', shadowRoot)

    // Mount React UI
    console.log('⚛️ Mounting UI...')
    replyPanel = shadowRoot
    
    try {
      mountReplyPanel(shadowRoot, {
        onGenerate: handleGenerateSuggestions,
        onClose: () => {
          console.log('🚪 Panel close callback triggered')
          if (replyPanel) {
            replyPanel.remove()
            replyPanel = null
          }
        },
        onInsert: insertText
      })
      console.log('✅ UI mounted successfully')
    } catch (error) {
      console.error('❌ Error mounting UI:', error)
      throw error
    }

    // Add to page
    console.log('📄 Adding shadow host to document body...')
    document.body.appendChild(shadowHost)
    console.log('✅ Shadow host added to page')

    // Add click outside to close (no backdrop)
    console.log('🖱️ Setting up click outside handler...')
    const handleClickOutside = (event) => {
      console.log('🖱️ Click outside detected:', event.target)
      if (replyPanel && !shadowHost.contains(event.target)) {
        console.log('🚪 Closing panel due to outside click')
        replyPanel.remove()
        replyPanel = null
        document.removeEventListener('click', handleClickOutside)
      }
    }
    
    // Add listener after a short delay to prevent immediate closure
    setTimeout(() => {
      console.log('⏰ Adding click outside listener')
      document.addEventListener('click', handleClickOutside)
    }, 100)
    
    console.log('✅ toggleReplyPanel finished successfully')
    
  } catch (error) {
    console.error('❌ Error inside toggleReplyPanel:', error)
    console.error('❌ Error stack:', error.stack)
    
    // Cleanup on error
    if (replyPanel) {
      try {
        replyPanel.remove()
        replyPanel = null
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError)
      }
    }
  }
}

/**
 * Handle suggestion generation
 */
async function handleGenerateSuggestions() {
  console.log('🔄 Generating suggestions...')
  
  try {
    // Get recent messages for context
    const recentMessages = getRecentMessages(currentAdapter, 5)
    console.log('📝 Recent messages:', recentMessages)
    
    // Get tone from storage
    const tone = await chrome.storage.sync.get('defaultTone')
    const selectedTone = tone.defaultTone || 'professional'
    
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SUGGESTIONS',
      messages: recentMessages,
      tone: selectedTone
    })
    
    console.log('✅ Suggestions received:', response)
    return response.suggestions || ['No suggestions available']
    
  } catch (error) {
    console.error('❌ Error generating suggestions:', error)
    return ['Error generating suggestions. Please try again.']
  }
}

/**
 * Insert text into the input field
 */
function insertText(text) {
  console.log('📝 Inserting text:', text)
  
  const inputField = document.querySelector(currentAdapter.inputSelector)
  if (!inputField) {
    console.error('❌ No input field found for text insertion')
    return false
  }
  
  return currentAdapter.insertText(inputField, text)
}

// Live transcript state
let liveTranscript = ''
let transcriptUpdateCallback = null

/**
 * Update the live transcript display
 */
function updateTranscriptUI(transcript) {
  console.log('🎤 Live transcript update:', transcript)
  liveTranscript = transcript
  
  // If we have a callback (UI is open), call it
  if (transcriptUpdateCallback) {
    transcriptUpdateCallback(transcript)
  }
}

/**
 * Set the transcript update callback (called when UI opens)
 */
function setTranscriptUpdateCallback(callback) {
  transcriptUpdateCallback = callback
  // Immediately call with current transcript if available
  if (liveTranscript && callback) {
    callback(liveTranscript)
  }
}

/**
 * Clear the transcript update callback (called when UI closes)
 */
function clearTranscriptUpdateCallback() {
  transcriptUpdateCallback = null
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('📨 Content script received message:', msg)
  
  if (msg.type === 'LIVE_TRANSCRIPT_UPDATE') {
    console.log('🎤 Received live transcript:', msg.transcript)
    updateTranscriptUI(msg.transcript)
    sendResponse({ success: true })
    return true // Keep message channel open for async response
  }
  
  return false
})

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}
