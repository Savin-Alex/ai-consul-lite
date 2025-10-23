/**
 * WhatsApp Simple Test Script - Version 4
 * Definitely waits for chat to open before doing anything
 */

console.log('🔍 WhatsApp Simple Test Script v10 Loading...')

if (window.location.hostname === 'web.whatsapp.com') {
  console.log('✅ WhatsApp Web detected - Waiting for chat to open...')
  
  let hasInitialized = false
  let currentChatInput = null
  
  // Comprehensive selector discovery function
  function discoverChatInput() {
    console.log('🔍 COMPREHENSIVE SELECTOR DISCOVERY:')
    
    // Test all possible selectors - updated with correct nested structure
    const selectors = [
      '.lexical-rich-text-input div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])',
      'div[contenteditable="true"][role="textbox"][aria-placeholder*="message"]',
      'div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])',
      'div[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '.lexical-rich-text-input',
      'div[data-testid="conversation-compose-box-input"]',
      '[data-testid*="compose"]',
      '[data-testid*="input"]'
    ]
    
    selectors.forEach((selector, index) => {
      const elements = document.querySelectorAll(selector)
      console.log(`🔍 Selector ${index + 1}: "${selector}"`)
      console.log(`   Found ${elements.length} element(s)`)
      
      elements.forEach((el, elIndex) => {
        console.log(`   Element ${elIndex + 1}:`, {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          'data-testid': el.getAttribute('data-testid'),
          'aria-label': el.getAttribute('aria-label'),
          'aria-placeholder': el.getAttribute('aria-placeholder'),
          placeholder: el.getAttribute('placeholder'),
          contenteditable: el.getAttribute('contenteditable'),
          role: el.getAttribute('role')
        })
      })
    })
    
    // Look for any input-like elements
    const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]')
    console.log(`🔍 Found ${allInputs.length} total input-like elements on page`)
    
    return null // This is just for discovery
  }
  
  function initializeExtension() {
    console.log('🎯 Chat detected! Initializing extension v10...')
    
    // More specific check - look for the actual contenteditable input field inside chat
    // The real input is nested: .lexical-rich-text-input > div[contenteditable="true"][role="textbox"]
    const chatInputField = document.querySelector('.lexical-rich-text-input div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])') ||
                          document.querySelector('div[contenteditable="true"][role="textbox"][aria-placeholder*="message"]') ||
                          document.querySelector('div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])')
    
    if (chatInputField && chatInputField !== currentChatInput) {
      console.log('✅ New chat input field found:', chatInputField)
      
      // Remove old AI icon if it exists
      if (currentChatInput) {
        const oldIcon = currentChatInput.parentElement?.querySelector('[data-ai-icon]')
        if (oldIcon) {
          oldIcon.remove()
          console.log('🗑️ Removed old AI icon')
        }
      }
      
      currentChatInput = chatInputField
      
      // Inject the AI icon
      const inputContainer = chatInputField.parentElement
      if (inputContainer) {
        const aiIcon = document.createElement('div')
        aiIcon.innerHTML = '🤖'
        aiIcon.setAttribute('data-ai-icon', 'true')
        aiIcon.title = 'Click to test AI Consul Lite v10'
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
        
        aiIcon.addEventListener('click', (event) => {
          console.log('🤖 AI icon clicked!', event)
          
          // Visual feedback
          aiIcon.style.transform = 'translateY(-50%) scale(0.9)'
          setTimeout(() => {
            aiIcon.style.transform = 'translateY(-50%) scale(1)'
          }, 100)
          
          // Test inserting text with proper Lexical editor handling
          const testText = 'Hello from AI Consul Lite v10!'
          console.log('📝 Testing text insertion:', testText)
          
          try {
            // Focus the input field first
            chatInputField.focus()
            
            // Clear existing content
            chatInputField.innerHTML = ''
            
            // Create a proper paragraph element for Lexical
            const paragraph = document.createElement('p')
            paragraph.className = 'selectable-text copyable-text x15bjb6t x1n2onr6'
            paragraph.setAttribute('dir', 'ltr')
            paragraph.style.cssText = 'text-indent: 0px; margin-top: 0px; margin-bottom: 0px;'
            
            // Create span for the text
            const span = document.createElement('span')
            span.className = 'selectable-text copyable-text xkrh14z'
            span.setAttribute('data-lexical-text', 'true')
            span.textContent = testText
            
            paragraph.appendChild(span)
            chatInputField.appendChild(paragraph)
            
            // Dispatch multiple events to trigger Lexical's update
            chatInputField.dispatchEvent(new Event('input', { bubbles: true }))
            chatInputField.dispatchEvent(new Event('change', { bubbles: true }))
            chatInputField.dispatchEvent(new Event('keyup', { bubbles: true }))
            chatInputField.dispatchEvent(new Event('keydown', { bubbles: true }))
            
            // Also try setting the value directly
            if (chatInputField.setAttribute) {
              chatInputField.setAttribute('data-value', testText)
            }
            
            console.log('✅ Text insertion test completed')
            console.log('📝 Current input content:', chatInputField.innerHTML)
            
          } catch (error) {
            console.error('❌ Error inserting text:', error)
          }
        })
        
        inputContainer.style.position = 'relative'
        inputContainer.appendChild(aiIcon)
        console.log('✅ AI icon injected successfully')
      }
    } else if (chatInputField === currentChatInput) {
      console.log('🔄 Same chat input field, skipping re-initialization')
    } else {
      console.log('❌ No valid chat input field found')
    }
    
    console.log('🎯 Extension initialization v10 complete!')
  }
  
  // Only start monitoring, don't initialize immediately
  console.log('👀 Starting to monitor for chat to open...')
  
  // Monitor for chat opening
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        console.log('👀 Mutation detected, checking for input field...')
        
        // Test each selector individually with detailed logging
        const primaryInput = document.querySelector('.lexical-rich-text-input div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])')
        console.log('🔍 Primary selector result:', primaryInput)
        
        const messageInput = document.querySelector('div[contenteditable="true"][role="textbox"][aria-placeholder*="message"]')
        console.log('🔍 Message placeholder selector result:', messageInput)
        
        const fallbackInput = document.querySelector('div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])')
        console.log('🔍 Fallback selector result:', fallbackInput)
        
        // Look for the specific chat compose box
        const chatInputField = primaryInput || messageInput || fallbackInput
        if (chatInputField) {
          console.log('✅ Found input via selector! Element:', chatInputField)
          console.log('🎯 Chat compose box detected via observer!')
          setTimeout(initializeExtension, 1000)
        } else {
          // If no input found, run discovery to see what's available
          console.log('❌ No input field found, running discovery...')
          discoverChatInput()
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
    
    console.log('⏰ Interval check #' + checkCount + ' - scanning for input field...')
    
    // Test each selector individually with detailed logging
    const primaryInput = document.querySelector('.lexical-rich-text-input div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])')
    console.log('🔍 Primary selector result:', primaryInput)
    
    const messageInput = document.querySelector('div[contenteditable="true"][role="textbox"][aria-placeholder*="message"]')
    console.log('🔍 Message placeholder selector result:', messageInput)
    
    const fallbackInput = document.querySelector('div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])')
    console.log('🔍 Fallback selector result:', fallbackInput)
    
    const chatInputField = primaryInput || messageInput || fallbackInput
    if (chatInputField) {
      console.log('✅ Found input via interval check! Element:', chatInputField)
      console.log('🎯 Chat compose box detected via interval check!')
      clearInterval(intervalCheck)
      setTimeout(initializeExtension, 1000)
    } else if (checkCount % 5 === 0) {
      // Run discovery every 5 checks to see what's available
      console.log('❌ No input field found after ' + checkCount + ' checks, running discovery...')
      discoverChatInput()
    }
  }, 1000)
  
  console.log('👀 Monitoring for chat to open... (Open a chat to continue)')
  
} else {
  console.log('❌ Not on WhatsApp Web')
}
