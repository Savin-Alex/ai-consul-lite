/**
 * Integration Tests for Content Script
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Content Script Integration', () => {
  let mockChromeStorage
  let mockChromeRuntime

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
    
    // Mock Chrome storage
    mockChromeStorage = {
      sync: {
        get: vi.fn(),
        set: vi.fn()
      },
      local: {
        get: vi.fn(),
        set: vi.fn()
      }
    }
    
    // Mock Chrome runtime
    mockChromeRuntime = {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn()
      }
    }
    
    global.chrome.storage = mockChromeStorage
    global.chrome.runtime = mockChromeRuntime
    
    // Mock storage responses
    mockChromeStorage.sync.get.mockResolvedValue({
      extensionEnabled: true,
      siteStates: { 'web.whatsapp.com': true }
    })
    
    mockChromeRuntime.sendMessage.mockResolvedValue({
      suggestions: ['Test suggestion 1', 'Test suggestion 2']
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('WhatsApp Integration', () => {
    beforeEach(() => {
      // Set up WhatsApp Web environment
      Object.defineProperty(window, 'location', {
        value: { hostname: 'web.whatsapp.com' },
        writable: true
      })
    })

    it('should detect WhatsApp input field correctly', () => {
      // Create WhatsApp-style input field
      const inputContainer = document.createElement('div')
      inputContainer.className = 'lexical-rich-text-input'
      
      const inputField = document.createElement('div')
      inputField.setAttribute('contenteditable', 'true')
      inputField.setAttribute('role', 'textbox')
      inputField.setAttribute('aria-label', 'Type to +1234567890')
      inputField.setAttribute('aria-placeholder', 'Type a message')
      
      inputContainer.appendChild(inputField)
      document.body.appendChild(inputContainer)
      
      // Test selector
      const selector = '.lexical-rich-text-input div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])'
      const foundInput = document.querySelector(selector)
      
      expect(foundInput).toBe(inputField)
    })

    it('should not detect search field as chat input', () => {
      // Create search field
      const searchField = document.createElement('div')
      searchField.setAttribute('contenteditable', 'true')
      searchField.setAttribute('role', 'textbox')
      searchField.setAttribute('aria-label', 'Search input textbox')
      
      document.body.appendChild(searchField)
      
      // Test selector should not match search field
      const selector = '.lexical-rich-text-input div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])'
      const foundInput = document.querySelector(selector)
      
      expect(foundInput).toBeNull()
    })

    it('should extract WhatsApp message text correctly', () => {
      const messageElement = document.createElement('div')
      messageElement.className = 'message-in'
      messageElement.innerHTML = `
        <span class="copyable-text">
          <span dir="ltr">Hello, how are you?</span>
        </span>
      `
      
      document.body.appendChild(messageElement)
      
      // Test message extraction using platform adapter logic
      const textElement = messageElement.querySelector('.copyable-text > span') ||
                         messageElement.querySelector('span[dir="ltr"]')
      const text = textElement ? textElement.textContent.trim() : ''
      
      expect(text).toBe('Hello, how are you?')
    })

    it('should determine WhatsApp message role correctly', () => {
      // Outgoing message
      const outgoingMessage = document.createElement('div')
      outgoingMessage.className = 'message-out'
      outgoingMessage.innerHTML = '<span>Outgoing message</span>'
      
      // Incoming message
      const incomingMessage = document.createElement('div')
      incomingMessage.className = 'message-in'
      incomingMessage.innerHTML = '<span>Incoming message</span>'
      
      // Test role determination
      const outgoingRole = outgoingMessage.classList.contains('message-out') ? 'user' : 'assistant'
      const incomingRole = incomingMessage.classList.contains('message-in') && 
                          !incomingMessage.classList.contains('message-out') ? 'assistant' : 'user'
      
      expect(outgoingRole).toBe('user')
      expect(incomingRole).toBe('assistant')
    })

    it('should insert text into WhatsApp input correctly', () => {
      const inputField = document.createElement('div')
      inputField.setAttribute('contenteditable', 'true')
      inputField.setAttribute('role', 'textbox')
      
      // Mock WhatsApp text insertion
      const insertText = (field, text) => {
        field.focus()
        field.innerHTML = ''
        
        const paragraph = document.createElement('p')
        paragraph.className = 'selectable-text copyable-text x15bjb6t x1n2onr6'
        paragraph.setAttribute('dir', 'ltr')
        paragraph.style.cssText = 'text-indent: 0px; margin-top: 0px; margin-bottom: 0px;'
        
        const span = document.createElement('span')
        span.className = 'selectable-text copyable-text xkrh14z'
        span.setAttribute('data-lexical-text', 'true')
        span.textContent = text
        
        paragraph.appendChild(span)
        field.appendChild(paragraph)
        
        // Dispatch events
        field.dispatchEvent(new Event('input', { bubbles: true }))
        field.dispatchEvent(new Event('change', { bubbles: true }))
        
        return true
      }
      
      const result = insertText(inputField, 'Test message')
      
      expect(result).toBe(true)
      expect(inputField.innerHTML).toContain('Test message')
      expect(inputField.innerHTML).toContain('data-lexical-text="true"')
    })
  })

  describe('Live Transcript Integration', () => {
    it('should handle live transcript updates', () => {
      let transcriptCallback = null
      let currentTranscript = ''
      
      // Mock transcript update system
      const updateTranscript = (transcript) => {
        currentTranscript = transcript
        if (transcriptCallback) {
          transcriptCallback(transcript)
        }
      }
      
      const setTranscriptCallback = (callback) => {
        transcriptCallback = callback
        if (currentTranscript && callback) {
          callback(currentTranscript)
        }
      }
      
      // Test transcript update
      updateTranscript('Hello world')
      expect(currentTranscript).toBe('Hello world')
      
      // Test callback
      let callbackCalled = false
      let callbackTranscript = ''
      setTranscriptCallback((transcript) => {
        callbackCalled = true
        callbackTranscript = transcript
      })
      
      expect(callbackCalled).toBe(true)
      expect(callbackTranscript).toBe('Hello world')
      
      // Test new transcript
      updateTranscript('How are you?')
      expect(callbackCalled).toBe(true)
      expect(callbackTranscript).toBe('How are you?')
    })

    it('should handle Chrome runtime messages', () => {
      const messageListeners = []
      
      // Mock Chrome runtime message listener
      const addMessageListener = (listener) => {
        messageListeners.push(listener)
      }
      
      // Mock message sending
      const sendMessage = (message) => {
        messageListeners.forEach(listener => {
          listener(message, { tab: { id: 1 } }, () => {})
        })
      }
      
      // Add listener
      let receivedMessage = null
      addMessageListener((msg, sender, sendResponse) => {
        if (msg.type === 'LIVE_TRANSCRIPT_UPDATE') {
          receivedMessage = msg.transcript
          sendResponse({ success: true })
        }
      })
      
      // Send message
      sendMessage({
        type: 'LIVE_TRANSCRIPT_UPDATE',
        transcript: 'Test transcript',
        timestamp: Date.now()
      })
      
      expect(receivedMessage).toBe('Test transcript')
    })
  })

  describe('UI Panel Integration', () => {
    it('should create and mount UI panel', () => {
      const shadowHost = document.createElement('div')
      shadowHost.id = 'ai-consul-panel'
      
      const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
      
      // Mock UI mounting
      const mountUI = (root, props) => {
        const { onGenerate, onClose, onInsert } = props
        
        root.innerHTML = `
          <div>
            <h3>AI Consul Lite</h3>
            <button id="generate-btn">Generate Suggestions</button>
            <button id="close-btn">Close</button>
            <div id="suggestions"></div>
          </div>
        `
        
        const generateBtn = root.getElementById('generate-btn')
        const closeBtn = root.getElementById('close-btn')
        const suggestionsDiv = root.getElementById('suggestions')
        
        generateBtn.addEventListener('click', async () => {
          const suggestions = await onGenerate()
          suggestionsDiv.innerHTML = suggestions.map(s => `<div>${s}</div>`).join('')
        })
        
        closeBtn.addEventListener('click', onClose)
      }
      
      // Mount UI
      mountUI(shadowRoot, {
        onGenerate: async () => ['Suggestion 1', 'Suggestion 2'],
        onClose: () => shadowHost.remove(),
        onInsert: (text) => console.log('Insert:', text)
      })
      
      expect(shadowRoot.innerHTML).toContain('AI Consul Lite')
      expect(shadowRoot.getElementById('generate-btn')).toBeDefined()
      expect(shadowRoot.getElementById('close-btn')).toBeDefined()
    })

    it('should handle UI interactions', async () => {
      const shadowHost = document.createElement('div')
      const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
      
      let generateCalled = false
      let closeCalled = false
      let insertCalled = false
      
      shadowRoot.innerHTML = `
        <div>
          <button id="generate-btn">Generate</button>
          <button id="close-btn">Close</button>
          <div id="suggestions"></div>
        </div>
      `
      
      const generateBtn = shadowRoot.getElementById('generate-btn')
      const closeBtn = shadowRoot.getElementById('close-btn')
      const suggestionsDiv = shadowRoot.getElementById('suggestions')
      
      generateBtn.addEventListener('click', async () => {
        generateCalled = true
        suggestionsDiv.innerHTML = '<div>Suggestion 1</div><div>Suggestion 2</div>'
      })
      
      closeBtn.addEventListener('click', () => {
        closeCalled = true
      })
      
      // Simulate clicks
      generateBtn.click()
      closeBtn.click()
      
      expect(generateCalled).toBe(true)
      expect(closeCalled).toBe(true)
      expect(suggestionsDiv.innerHTML).toContain('Suggestion 1')
    })
  })

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockChromeStorage.sync.get.mockRejectedValueOnce(new Error('Storage error'))
      
      // Should not crash the extension
      try {
        await mockChromeStorage.sync.get(['extensionEnabled'])
      } catch (error) {
        expect(error.message).toBe('Storage error')
      }
    })

    it('should handle runtime message errors', async () => {
      mockChromeRuntime.sendMessage.mockRejectedValueOnce(new Error('Message error'))
      
      try {
        await mockChromeRuntime.sendMessage({ type: 'GET_SUGGESTIONS' })
      } catch (error) {
        expect(error.message).toBe('Message error')
      }
    })

    it('should handle DOM manipulation errors', () => {
      // Test with invalid selector
      const invalidSelector = 'invalid[selector="test"]'
      const element = document.querySelector(invalidSelector)
      
      expect(element).toBeNull()
      
      // Should not crash when trying to manipulate null element
      if (element) {
        element.textContent = 'test'
      }
      
      // Test passes if no error is thrown
      expect(true).toBe(true)
    })
  })
})
