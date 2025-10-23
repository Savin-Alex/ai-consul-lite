/**
 * WhatsApp Simple Test Script - Version 4
 * Definitely waits for chat to open before doing anything
 */

console.log('🔍 WhatsApp Simple Test Script v6 Loading...')

if (window.location.hostname === 'web.whatsapp.com') {
  console.log('✅ WhatsApp Web detected - Waiting for chat to open...')
  
  let hasInitialized = false
  
  function initializeExtension() {
    if (hasInitialized) return
    hasInitialized = true
    
    console.log('🎯 Chat detected! Initializing extension v6...')
    
    // More specific check - look for input field that's actually in a chat context
    // The chat input should be in a specific container structure
    const chatInputField = document.querySelector('div[data-testid="conversation-compose-box-input"]') ||
                          document.querySelector('.lexical-rich-text-input[data-testid*="compose"]') ||
                          document.querySelector('.lexical-rich-text-input:not([aria-label*="Search"]):not([aria-label*="search"])')
    
    if (chatInputField) {
      console.log('✅ Chat input field found:', chatInputField)
      
      // Inject the AI icon
      const inputContainer = chatInputField.parentElement
      if (inputContainer) {
        const aiIcon = document.createElement('div')
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
        
        aiIcon.addEventListener('click', () => {
          console.log('🤖 AI icon clicked!')
          
          // Test inserting text
          const testText = 'Hello from AI Consul Lite v6!'
          console.log('📝 Testing text insertion:', testText)
          
          chatInputField.focus()
          chatInputField.textContent = testText
          chatInputField.dispatchEvent(new Event('input', { bubbles: true }))
          chatInputField.dispatchEvent(new Event('change', { bubbles: true }))
          chatInputField.dispatchEvent(new Event('keyup', { bubbles: true }))
          
          console.log('✅ Text insertion test completed')
        })
        
        inputContainer.style.position = 'relative'
        inputContainer.appendChild(aiIcon)
        console.log('✅ AI icon injected successfully')
      }
    }
    
    console.log('🎯 Extension initialization v6 complete!')
  }
  
  // Only start monitoring, don't initialize immediately
  console.log('👀 Starting to monitor for chat to open...')
  
  // Monitor for chat opening
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Look for the specific chat compose box
        const chatInputField = document.querySelector('div[data-testid="conversation-compose-box-input"]') ||
                              document.querySelector('.lexical-rich-text-input[data-testid*="compose"]')
        if (chatInputField && !hasInitialized) {
          console.log('🎯 Chat compose box detected via observer!')
          setTimeout(initializeExtension, 1000)
        }
      }
    })
  })
  
  observer.observe(document.body, { childList: true, subtree: true })
  
  // Also check periodically
  let checkCount = 0
  const intervalCheck = setInterval(() => {
    checkCount++
    if (checkCount > 30) {
      clearInterval(intervalCheck)
      console.log('⏰ Stopped monitoring after 30 seconds')
      return
    }
    
    const chatInputField = document.querySelector('div[data-testid="conversation-compose-box-input"]') ||
                          document.querySelector('.lexical-rich-text-input[data-testid*="compose"]')
    if (chatInputField && !hasInitialized) {
      console.log('🎯 Chat compose box detected via interval check!')
      clearInterval(intervalCheck)
      setTimeout(initializeExtension, 1000)
    }
  }, 1000)
  
  console.log('👀 Monitoring for chat to open... (Open a chat to continue)')
  
} else {
  console.log('❌ Not on WhatsApp Web')
}
