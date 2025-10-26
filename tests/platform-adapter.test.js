/**
 * Tests for Platform Adapter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAdapter, getRecentMessages, hasChatInterface } from '../src/lib/platform_adapter.js'

describe('Platform Adapter', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('getAdapter', () => {
    it('should return WhatsApp adapter for web.whatsapp.com', () => {
      const adapter = getAdapter('web.whatsapp.com')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('WhatsApp')
      expect(adapter.inputSelector).toContain('contenteditable="true"')
    })

    it('should return Telegram adapter for web.telegram.org', () => {
      const adapter = getAdapter('web.telegram.org')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('Telegram')
      expect(adapter.inputSelector).toContain('input-message-container')
    })

    it('should return Slack adapter for app.slack.com', () => {
      const adapter = getAdapter('app.slack.com')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('Slack')
      expect(adapter.inputSelector).toContain('data-qa="message_input"')
    })

    it('should return Discord adapter for discord.com', () => {
      const adapter = getAdapter('discord.com')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('Discord')
    })

    it('should return LinkedIn adapter for www.linkedin.com', () => {
      const adapter = getAdapter('www.linkedin.com')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('LinkedIn')
    })

    it('should return Messenger adapter for www.messenger.com', () => {
      const adapter = getAdapter('www.messenger.com')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('Messenger')
    })

    it('should return Google Chat adapter for chat.google.com', () => {
      const adapter = getAdapter('chat.google.com')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('Google Chat')
    })

    it('should return null for unsupported hostname', () => {
      const adapter = getAdapter('unsupported.com')
      expect(adapter).toBeNull()
    })
  })

  describe('WhatsApp Adapter', () => {
    let adapter

    beforeEach(() => {
      adapter = getAdapter('web.whatsapp.com')
    })

    it('should have correct selectors', () => {
      expect(adapter.inputSelector).toBe('div[data-testid="conversation-compose-box-input"], div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"]):not([aria-label*="search"])')
      expect(adapter.messageSelector).toBe('div.message-in, div.message-out')
    })

    it('should extract message text correctly', () => {
      const mockElement = document.createElement('div')
      mockElement.className = 'message-in'
      mockElement.innerHTML = `
        <span class="copyable-text"><span dir="ltr">Hello world</span></span>
      `
      
      const text = adapter.getMessageText(mockElement)
      expect(text).toBe('Hello world')
    })

    it('should determine message role correctly', () => {
      const outgoingElement = document.createElement('div')
      outgoingElement.className = 'message-out'
      outgoingElement.innerHTML = '<span>Outgoing message</span>'
      
      const incomingElement = document.createElement('div')
      incomingElement.className = 'message-in'
      incomingElement.innerHTML = '<span>Incoming message</span>'
      
      expect(adapter.getMessageRole(outgoingElement)).toBe('user')
      expect(adapter.getMessageRole(incomingElement)).toBe('assistant')
    })

    it('should insert text correctly', () => {
      const mockInput = document.createElement('div')
      mockInput.className = 'lexical-rich-text-input'
      mockInput.innerHTML = '<div contenteditable="true" role="textbox"></div>'
      document.body.appendChild(mockInput)
      
      adapter.insertText('Test message')
      
      // Check that the text was inserted (the function doesn't return a value)
      const contentEditableDiv = mockInput.querySelector('[contenteditable="true"]')
      expect(contentEditableDiv.textContent).toBe('Test message')
      
      document.body.removeChild(mockInput)
    })
  })

  describe('Telegram Adapter', () => {
    let adapter

    beforeEach(() => {
      adapter = getAdapter('web.telegram.org')
    })

    it('should have correct selectors', () => {
      expect(adapter.inputSelector).toBe('.input-message-container .input-message-input')
      expect(adapter.messageSelector).toBe('.messages-container .message')
    })

    it('should extract message text correctly', () => {
      const mockElement = document.createElement('div')
      mockElement.className = 'message'
      mockElement.innerHTML = '<div class="message-text">Telegram message</div>'
      
      const text = adapter.getMessageText(mockElement)
      expect(text).toBe('Telegram message')
    })

    it('should determine message role correctly', () => {
      const outgoingElement = document.createElement('div')
      outgoingElement.className = 'message message-out'
      
      const incomingElement = document.createElement('div')
      incomingElement.className = 'message'
      
      expect(adapter.getMessageRole(outgoingElement)).toBe('user')
      expect(adapter.getMessageRole(incomingElement)).toBe('assistant')
    })

    it('should insert text correctly', () => {
      const mockContainer = document.createElement('div')
      mockContainer.className = 'input-message-container'
      const mockInput = document.createElement('div')
      mockInput.className = 'input-message-input'
      mockInput.setAttribute('contenteditable', 'true')
      mockContainer.appendChild(mockInput)
      document.body.appendChild(mockContainer)
      
      adapter.insertText('Telegram test')
      
      // Check that the text was inserted (the function doesn't return a value)
      expect(mockInput.textContent).toBe('Telegram test')
      
      document.body.removeChild(mockContainer)
    })
  })

  describe('Slack Adapter', () => {
    let adapter

    beforeEach(() => {
      adapter = getAdapter('app.slack.com')
    })

    it('should have correct selectors', () => {
      expect(adapter.inputSelector).toBe('[data-qa="message_input"]')
      expect(adapter.messageSelector).toBe('[data-qa="virtual-list"] [data-qa="message_container"]')
    })

    it('should extract message text correctly', () => {
      const mockElement = document.createElement('div')
      mockElement.setAttribute('data-qa', 'message_container')
      mockElement.innerHTML = '<div data-qa="message_text">Slack message</div>'
      
      const text = adapter.getMessageText(mockElement)
      expect(text).toBe('Slack message')
    })

    it('should determine message role correctly', () => {
      const sentElement = document.createElement('div')
      sentElement.innerHTML = '<div data-qa="message">User message</div>'
      
      const receivedElement = document.createElement('div')
      receivedElement.className = 'c-message'
      
      expect(adapter.getMessageRole(sentElement)).toBe('user')
      expect(adapter.getMessageRole(receivedElement)).toBe('assistant')
    })

    it('should insert text correctly', () => {
      const mockInput = document.createElement('div')
      mockInput.setAttribute('data-qa', 'message_input')
      mockInput.setAttribute('contenteditable', 'true')
      document.body.appendChild(mockInput)
      
      adapter.insertText('Slack test')
      
      // Check that the text was inserted (the function doesn't return a value)
      expect(mockInput.textContent).toBe('Slack test')
      
      document.body.removeChild(mockInput)
    })
  })

  describe('getRecentMessages', () => {
    it('should return recent messages from WhatsApp', () => {
      // Create mock message elements
      const message1 = document.createElement('div')
      message1.className = 'message-in'
      message1.innerHTML = '<span class="copyable-text"><span dir="ltr">First message</span></span>'
      
      const message2 = document.createElement('div')
      message2.className = 'message-out'
      message2.innerHTML = '<span class="copyable-text"><span dir="ltr">Second message</span></span>'
      
      document.body.appendChild(message1)
      document.body.appendChild(message2)
      
      const adapter = getAdapter('web.whatsapp.com')
      const messages = getRecentMessages(adapter, 2)
      
      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('First message')
      expect(messages[0].role).toBe('assistant')
      expect(messages[1].content).toBe('Second message')
      expect(messages[1].role).toBe('user')
    })

    it('should limit messages to specified count', () => {
      // Create multiple message elements
      for (let i = 0; i < 5; i++) {
        const message = document.createElement('div')
        message.className = 'message-in'
        message.innerHTML = `<span class="copyable-text"><span dir="ltr">Message ${i}</span></span>`
        document.body.appendChild(message)
      }
      
      const adapter = getAdapter('web.whatsapp.com')
      const messages = getRecentMessages(adapter, 3)
      
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('Message 2') // Last 3 messages
      expect(messages[1].content).toBe('Message 3')
      expect(messages[2].content).toBe('Message 4')
    })

    it('should return empty array when no messages found', () => {
      const adapter = getAdapter('web.whatsapp.com')
      const messages = getRecentMessages(adapter, 5)
      
      expect(messages).toHaveLength(0)
    })
  })

  describe('hasChatInterface', () => {
    it('should return true when input field exists', () => {
      const inputField = document.createElement('div')
      inputField.className = 'lexical-rich-text-input'
      inputField.innerHTML = '<div contenteditable="true" role="textbox"></div>'
      document.body.appendChild(inputField)
      
      const adapter = getAdapter('web.whatsapp.com')
      const hasInterface = hasChatInterface(adapter)
      
      expect(hasInterface).toBe(true)
    })

    it('should return false when input field does not exist', () => {
      const adapter = getAdapter('web.whatsapp.com')
      const hasInterface = hasChatInterface(adapter)
      
      expect(hasInterface).toBe(false)
    })
  })
})
