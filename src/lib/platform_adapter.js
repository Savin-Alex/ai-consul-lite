/**
 * Platform Adapter for AI Consul Lite
 * Handles chat platform detection and DOM interaction for different messaging platforms
 */

/**
 * Get platform adapter for the current hostname
 * @param {string} hostname - The hostname of the current page
 * @returns {Object|null} Platform adapter object or null if unsupported
 */
export function getAdapter(hostname) {
  switch (hostname) {
    case 'web.whatsapp.com':
      return whatsappAdapter
    case 'web.telegram.org':
      return telegramAdapter
    case 'app.slack.com':
      return slackAdapter
    case 'discord.com':
      return discordAdapter
    case 'www.linkedin.com':
      return linkedinAdapter
    case 'www.messenger.com':
      return messengerAdapter
    case 'chat.google.com':
      return googleChatAdapter
    default:
      return null
  }
}

// WhatsApp Web Adapter - Updated for current WhatsApp Web structure
const whatsappAdapter = {
  name: 'WhatsApp',
  // Hybrid approach: Try data-testid first, fallback to contenteditable
  inputSelector: 'div[data-testid="conversation-compose-box-input"], div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"]):not([aria-label*="search"])',
  // Updated: Use class-based selector for WhatsApp message containers
  messageSelector: 'div.message-in, div.message-out',
  
  getMessageText(node) {
    // This selector should now correctly find the text within the "msg-container"
    const textElement = node.querySelector('.copyable-text > span') ||
                       node.querySelector('[data-testid="msg-text"]') ||
                       node.querySelector('span[dir="ltr"]') ||
                       node.querySelector('.selectable-text')
    
    if (textElement) {
      const text = textElement.textContent?.trim()
      // Filter out very short or very long text (likely not messages)
      if (text && text.length > 2 && text.length < 1000) {
        return text
      }
    }
    
    // Fallback: get text content directly from the node
    const text = node.textContent?.trim()
    // Filter out very short or very long text (likely not messages)
    if (text && text.length > 2 && text.length < 1000) {
      return text
    }
    
    return ''
  },
  
  getMessageRole(node) {
    // Check if the message container is outgoing based on class
    const isOutgoing = node.classList.contains('message-out')
    
    return isOutgoing ? 'user' : 'assistant'
  },
  
  insertText(text) {
    const input = document.querySelector(this.inputSelector)
    if (input) {
      input.focus()
      
      // For lexical editor, we need to simulate typing
      input.textContent = text
      
      // Dispatch multiple events to ensure WhatsApp detects the change
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.dispatchEvent(new Event('keyup', { bubbles: true }))
      
      // Also try setting the innerHTML for lexical editor
      if (input.classList.contains('lexical-rich-text-input')) {
        input.innerHTML = `<p>${text}</p>`
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  }
}

// Telegram Web Adapter
const telegramAdapter = {
  name: 'Telegram',
  // Targets: <div class="input-message-container"> <div class="input-message-input" contenteditable="true">
  inputSelector: '.input-message-container .input-message-input',
  // Targets: <div class="messages-container"> <div class="message">
  messageSelector: '.messages-container .message',
  
  getMessageText(node) {
    const textElement = node.querySelector('.message-text')
    return textElement ? textElement.textContent.trim() : ''
  },
  
  getMessageRole(node) {
    return node.classList.contains('message-out') ? 'user' : 'assistant'
  },
  
  insertText(text) {
    const input = document.querySelector(this.inputSelector)
    if (input) {
      input.focus()
      input.textContent = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

// Slack Web Adapter
const slackAdapter = {
  name: 'Slack',
  // Targets: <div data-qa="message_input" contenteditable="true">
  inputSelector: '[data-qa="message_input"]',
  // Targets: <div data-qa="virtual-list"> <div data-qa="message_container">
  messageSelector: '[data-qa="virtual-list"] [data-qa="message_container"]',
  
  getMessageText(node) {
    const textElement = node.querySelector('[data-qa="message_text"]')
    return textElement ? textElement.textContent.trim() : ''
  },
  
  getMessageRole(node) {
    // Slack messages have data-qa="message" for user messages
    return node.querySelector('[data-qa="message"]') ? 'user' : 'assistant'
  },
  
  insertText(text) {
    const input = document.querySelector(this.inputSelector)
    if (input) {
      input.focus()
      input.textContent = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

// Discord Web Adapter
const discordAdapter = {
  name: 'Discord',
  inputSelector: '[data-slate-editor="true"]',
  messageSelector: '[id^="chat-messages-"] [id^="chat-messages-"]',
  
  getMessageText(node) {
    const textElement = node.querySelector('[id^="message-content-"]')
    return textElement ? textElement.textContent.trim() : ''
  },
  
  getMessageRole(node) {
    return node.classList.contains('message-2qnXI6') && node.querySelector('[class*="messageContent"]') ? 'user' : 'assistant'
  },
  
  insertText(text) {
    const input = document.querySelector(this.inputSelector)
    if (input) {
      input.focus()
      input.textContent = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

// LinkedIn Adapter
const linkedinAdapter = {
  name: 'LinkedIn',
  inputSelector: '[data-test-id="messaging-compose-input"]',
  messageSelector: '[data-test-id="messaging-conversation"] [data-test-id="messaging-message"]',
  
  getMessageText(node) {
    const textElement = node.querySelector('[data-test-id="messaging-message-text"]')
    return textElement ? textElement.textContent.trim() : ''
  },
  
  getMessageRole(node) {
    return node.classList.contains('message--sent') ? 'user' : 'assistant'
  },
  
  insertText(text) {
    const input = document.querySelector(this.inputSelector)
    if (input) {
      input.focus()
      input.textContent = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

// Facebook Messenger Adapter
const messengerAdapter = {
  name: 'Messenger',
  inputSelector: '[data-testid="message_input"]',
  messageSelector: '[data-testid="message_group"] [data-testid="message"]',
  
  getMessageText(node) {
    const textElement = node.querySelector('[data-testid="message_text"]')
    return textElement ? textElement.textContent.trim() : ''
  },
  
  getMessageRole(node) {
    return node.classList.contains('message--sent') ? 'user' : 'assistant'
  },
  
  insertText(text) {
    const input = document.querySelector(this.inputSelector)
    if (input) {
      input.focus()
      input.textContent = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

// Google Chat Adapter
const googleChatAdapter = {
  name: 'Google Chat',
  inputSelector: '[data-testid="message-input"]',
  messageSelector: '[data-testid="message-list"] [data-testid="message"]',
  
  getMessageText(node) {
    const textElement = node.querySelector('[data-testid="message-text"]')
    return textElement ? textElement.textContent.trim() : ''
  },
  
  getMessageRole(node) {
    return node.classList.contains('message--sent') ? 'user' : 'assistant'
  },
  
  insertText(text) {
    const input = document.querySelector(this.inputSelector)
    if (input) {
      input.focus()
      input.textContent = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

/**
 * Get the last N messages from the current chat
 * @param {Object} adapter - Platform adapter object
 * @param {number} count - Number of messages to retrieve (default: 5)
 * @returns {Array} Array of message objects with role and content
 */
export function getRecentMessages(adapter, count = 5) {
  const messageElements = document.querySelectorAll(adapter.messageSelector)
  const messages = []
  
  // Get the last N messages
  const recentElements = Array.from(messageElements).slice(-count)
  
  for (const element of recentElements) {
    const text = adapter.getMessageText(element)
    const role = adapter.getMessageRole(element)
    
    if (text && text.length > 0) {
      messages.push({
        role: role,
        content: text,
        timestamp: Date.now() // Approximate timestamp
      })
    }
  }
  
  return messages
}

/**
 * Check if the current page has a chat interface
 * @param {Object} adapter - Platform adapter object
 * @returns {boolean} True if chat interface is detected
 */
export function hasChatInterface(adapter) {
  return document.querySelector(adapter.inputSelector) !== null
}
