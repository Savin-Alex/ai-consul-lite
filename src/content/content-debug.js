/**
 * Debug Content Script for AI Consul Lite
 * Simple version to test WhatsApp integration
 */

console.log('🔍 AI Consul Lite Debug Script Loading...')

// Check if we're on WhatsApp
if (window.location.hostname === 'web.whatsapp.com') {
  console.log('✅ WhatsApp Web detected')
  
  // Check extension state
  chrome.storage.sync.get(['extensionEnabled', 'siteStates'], (result) => {
    console.log('📊 Extension state:', result)
    
    const extensionEnabled = result.extensionEnabled !== false
    const hostname = window.location.hostname
    const siteEnabled = result.siteStates?.[hostname] !== false
    
    console.log(`🔧 Extension enabled: ${extensionEnabled}`)
    console.log(`🌐 Site enabled: ${siteEnabled}`)
    
    if (!extensionEnabled || !siteEnabled) {
      console.log('❌ Extension or site disabled')
      return
    }
    
    console.log('✅ Extension is active on WhatsApp')
    
    // Test selectors
    const inputSelector = '[data-testid="conversation-compose-box-input"]'
    const messageSelector = '[data-testid="conversation-panel-messages"] [data-testid="msg-container"]'
    
    const input = document.querySelector(inputSelector)
    const messages = document.querySelectorAll(messageSelector)
    
    console.log(`📝 Input field found: ${!!input}`)
    console.log(`💬 Messages found: ${messages.length}`)
    
    if (input) {
      console.log('📝 Input field details:', input)
    }
    
    // Monitor for new messages
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const newMessages = document.querySelectorAll(messageSelector)
          if (newMessages.length > messages.length) {
            console.log('🆕 New message detected!', newMessages[newMessages.length - 1])
          }
        }
      })
    })
    
    const messagesContainer = document.querySelector('[data-testid="conversation-panel-messages"]')
    if (messagesContainer) {
      observer.observe(messagesContainer, { childList: true, subtree: true })
      console.log('👀 Monitoring for new messages...')
    } else {
      console.log('❌ Messages container not found')
    }
    
    // Test icon injection
    setTimeout(() => {
      const inputContainer = document.querySelector('[data-testid="conversation-compose-box-input"]')?.parentElement
      if (inputContainer) {
        const debugIcon = document.createElement('div')
        debugIcon.innerHTML = '🤖'
        debugIcon.style.cssText = `
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          cursor: pointer;
          z-index: 1000;
          background: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `
        debugIcon.onclick = () => {
          console.log('🤖 Debug icon clicked!')
          alert('AI Consul Lite Debug: Icon clicked!')
        }
        
        inputContainer.style.position = 'relative'
        inputContainer.appendChild(debugIcon)
        console.log('✅ Debug icon injected')
      }
    }, 2000)
  })
} else {
  console.log('❌ Not on WhatsApp Web')
}
