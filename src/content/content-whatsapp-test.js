/**
 * WhatsApp Test Content Script
 * Tests the updated WhatsApp adapter
 */

console.log('🔍 WhatsApp Test Content Script v3 Loading...')

if (window.location.hostname === 'web.whatsapp.com') {
  console.log('✅ WhatsApp Web detected - Waiting for chat to open...')
  
  // Wait for chat to open
  let hasInitialized = false
  
  function initializeExtension() {
    if (hasInitialized) return
    hasInitialized = true
    
    console.log('🎯 Chat detected! Initializing extension...')
    
    // Test the input field
    const inputField = document.querySelector('.lexical-rich-text-input')
    if (inputField) {
      console.log('✅ Input field found:', inputField)
      
      // Inject the AI icon
      const inputContainer = inputField.parentElement
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
        
        aiIcon.addEventListener('mouseenter', () => {
          aiIcon.style.transform = 'translateY(-50%) scale(1.1)'
          aiIcon.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
        })
        
        aiIcon.addEventListener('mouseleave', () => {
          aiIcon.style.transform = 'translateY(-50%) scale(1)'
          aiIcon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
        })
        
        aiIcon.addEventListener('click', () => {
          console.log('🤖 AI icon clicked!')
          
          // Test inserting text
          const testText = 'Hello from AI Consul Lite!'
          console.log('📝 Testing text insertion:', testText)
          
          inputField.focus()
          inputField.textContent = testText
          inputField.dispatchEvent(new Event('input', { bubbles: true }))
          inputField.dispatchEvent(new Event('change', { bubbles: true }))
          inputField.dispatchEvent(new Event('keyup', { bubbles: true }))
          
          // Also try innerHTML for lexical editor
          if (inputField.classList.contains('lexical-rich-text-input')) {
            inputField.innerHTML = `<p>${testText}</p>`
            inputField.dispatchEvent(new Event('input', { bubbles: true }))
          }
          
          console.log('✅ Text insertion test completed')
        })
        
        inputContainer.style.position = 'relative'
        inputContainer.appendChild(aiIcon)
        console.log('✅ AI icon injected successfully')
      }
    }
    
    // Test message detection
    const messageElements = document.querySelectorAll('div[class*="x1c4vz4f"]')
    console.log(`💬 Found ${messageElements.length} potential message elements`)
    
    // Show details of first few messages
    Array.from(messageElements).slice(0, 3).forEach((msg, index) => {
      const text = msg.textContent?.trim()
      if (text && text.length > 5 && text.length < 500) {
        console.log(`   Message ${index + 1}:`, {
          text: text.substring(0, 50) + '...',
          className: msg.className,
          isOutgoing: msg.classList.contains('message-out') || 
                     msg.classList.contains('sent') ||
                     msg.querySelector('[class*="out"]') ||
                     msg.querySelector('[class*="sent"]')
        })
      }
    })
    
    console.log('🎯 Extension initialization complete!')
  }
  
  // Monitor for chat opening
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const inputField = document.querySelector('.lexical-rich-text-input')
        if (inputField && !hasInitialized) {
          console.log('🎯 Chat input field detected!')
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
      return
    }
    
    const inputField = document.querySelector('.lexical-rich-text-input')
    if (inputField && !hasInitialized) {
      console.log('🎯 Chat input field detected via interval check!')
      clearInterval(intervalCheck)
      setTimeout(initializeExtension, 1000)
    }
  }, 1000)
  
  console.log('👀 Monitoring for chat to open... (Open a chat to continue)')
  
} else {
  console.log('❌ Not on WhatsApp Web')
}
