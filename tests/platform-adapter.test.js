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
      expect(adapter.inputSelector).toContain('lexical-rich-text-input')
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
      expect(adapter.inputSelector).toBe('.lexical-rich-text-input div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])')
      expect(adapter.messageSelector).toBe('div[class*="x1c4vz4f"]')
    })

    it('should extract message text correctly', () => {
      const mockElement = document.createElement('div')
      mockElement.innerHTML = `
        <div data-testid="msg-container">
          <span dir="ltr">Hello world</span>
        </div>
      `
      
      const text = adapter.getMessageText(mockElement)
      expect(text).toBe('Hello world')
    })

    it('should determine message role correctly', () => {
      const outgoingElement = document.createElement('div')
      outgoingElement.innerHTML = `
        <div data-testid="msg-container-outgoing">
          <span>Outgoing message</span>
        </div>
      `
      
      const incomingElement = document.createElement('div')
      incomingElement.innerHTML = `
        <div data-testid="msg-container">
          <span>Incoming message</span>
        </div>
      `
      
      expect(adapter.getMessageRole(outgoingElement)).toBe('user')
      expect(adapter.getMessageRole(incomingElement)).toBe('assistant')
    })

    it('should insert text correctly', () => {
      const mockInput = document.createElement('div')
      mockInput.setAttribute('contenteditable', 'true')
      mockInput.setAttribute('role', 'textbox')
      
      const result = adapter.insertText(mockInput, 'Test message')
      
      expect(result).toBe(true)
      expect(mockInput.innerHTML).toContain('Test message')
      expect(mockInput.innerHTML).toContain('data-lexical-text="true"')
    })
  })

  describe('Telegram Adapter', () => {
    let adapter

    beforeEach(() => {
      adapter = getAdapter('web.telegram.org')
    })

    it('should have correct selectors', () => {
      expect(adapter.inputSelector).toBe('.input-message-container [contenteditable="true"]')
      expect(adapter.messageSelector).toBe('.message')
    })

    it('should extract message text correctly', () => {
      const mockElement = document.createElement('div')
      mockElement.className = 'message'
      mockElement.textContent = 'Telegram message'
      
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
      const mockInput = document.createElement('div')
      mockInput.setAttribute('contenteditable', 'true')
      
      const result = adapter.insertText(mockInput, 'Telegram test')
      
      expect(result).toBe(true)
      expect(mockInput.textContent).toBe('Telegram test')
    })
  })

  describe('Slack Adapter', () => {
    let adapter

    beforeEach(() => {
      adapter = getAdapter('app.slack.com')
    })

    it('should have correct selectors', () => {
      expect(adapter.inputSelector).toBe('[data-qa="message_input"]')
      expect(adapter.messageSelector).toBe('[data-qa="message"]')
    })

    it('should extract message text correctly', () => {
      const mockElement = document.createElement('div')
      mockElement.setAttribute('data-qa', 'message')
      mockElement.textContent = 'Slack message'
      
      const text = adapter.getMessageText(mockElement)
      expect(text).toBe('Slack message')
    })

    it('should determine message role correctly', () => {
      const sentElement = document.createElement('div')
      sentElement.className = 'c-message--sent'
      
      const receivedElement = document.createElement('div')
      receivedElement.className = 'c-message'
      
      expect(adapter.getMessageRole(sentElement)).toBe('user')
      expect(adapter.getMessageRole(receivedElement)).toBe('assistant')
    })

    it('should insert text correctly', () => {
      const mockInput = document.createElement('input')
      mockInput.setAttribute('data-qa', 'message_input')
      
      const result = adapter.insertText(mockInput, 'Slack test')
      
      expect(result).toBe(true)
      expect(mockInput.value).toBe('Slack test')
    })
  })

  describe('getRecentMessages', () => {
    it('should return recent messages from WhatsApp', () => {
      // Create mock message elements
      const message1 = document.createElement('div')
      message1.className = 'x1c4vz4f'
      message1.innerHTML = '<div data-testid="msg-container"><span dir="ltr">First message</span></div>'
      
      const message2 = document.createElement('div')
      message2.className = 'x1c4vz4f'
      message2.innerHTML = '<div data-testid="msg-container-outgoing"><span dir="ltr">Second message</span></div>'
      
      document.body.appendChild(message1)
      document.body.appendChild(message2)
      
      const adapter = getAdapter('web.whatsapp.com')
      const messages = getRecentMessages(adapter, 2)
      
      expect(messages).toHaveLength(2)
      expect(messages[0].text).toBe('First message')
      expect(messages[0].role).toBe('assistant')
      expect(messages[1].text).toBe('Second message')
      expect(messages[1].role).toBe('user')
    })

    it('should limit messages to specified count', () => {
      // Create multiple message elements
      for (let i = 0; i < 5; i++) {
        const message = document.createElement('div')
        message.className = 'x1c4vz4f'
        message.innerHTML = `<div data-testid="msg-container"><span dir="ltr">Message ${i}</span></div>`
        document.body.appendChild(message)
      }
      
      const adapter = getAdapter('web.whatsapp.com')
      const messages = getRecentMessages(adapter, 3)
      
      expect(messages).toHaveLength(3)
      expect(messages[0].text).toBe('Message 2') // Last 3 messages
      expect(messages[1].text).toBe('Message 3')
      expect(messages[2].text).toBe('Message 4')
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
