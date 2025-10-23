/**
 * WhatsApp Selector Discovery Script - Version 2
 * Waits for a chat to be opened before scanning for selectors
 */

console.log('🔍 WhatsApp Selector Discovery Script v2 Loading...')

if (window.location.hostname === 'web.whatsapp.com') {
  console.log('✅ WhatsApp Web detected - Waiting for chat to open...')
  
  let hasScanned = false
  
  // Function to scan for selectors
  function scanForSelectors() {
    if (hasScanned) return
    hasScanned = true
    
    console.log('🔍 Chat detected! Starting selector discovery v2...')
    
    // Look for the lexical input field specifically
    const lexicalInput = document.querySelector('.lexical-rich-text-input')
    if (lexicalInput) {
      console.log('✅ Found lexical input field:', lexicalInput)
      console.log('   Parent:', lexicalInput.parentElement?.className)
      console.log('   Grandparent:', lexicalInput.parentElement?.parentElement?.className)
      
      // Test if we can interact with it
      try {
        lexicalInput.focus()
        console.log('✅ Successfully focused lexical input field')
      } catch (e) {
        console.log('❌ Failed to focus lexical input field:', e)
      }
    }
    
    // Look for message containers
    const messageContainers = document.querySelectorAll('[class*="message"]')
    console.log(`💬 Found ${messageContainers.length} potential message containers`)
    
    messageContainers.forEach((container, index) => {
      if (container.children.length > 0) {
        console.log(`   Container ${index + 1}:`, {
          className: container.className,
          childCount: container.children.length,
          scrollHeight: container.scrollHeight,
          firstChild: container.firstChild?.className
        })
      }
    })
    
    // Look for individual messages
    const allDivs = document.querySelectorAll('div')
    const messageDivs = Array.from(allDivs).filter(div => {
      const text = div.textContent || ''
      return text.length > 10 && text.length < 500 && 
             !div.className.includes('search') &&
             !div.className.includes('header') &&
             !div.className.includes('footer')
    })
    
    console.log(`💬 Found ${messageDivs.length} potential message divs`)
    messageDivs.slice(0, 5).forEach((div, index) => {
      console.log(`   Message ${index + 1}:`, {
        className: div.className,
        textContent: div.textContent?.substring(0, 50) + '...',
        parentClassName: div.parentElement?.className
      })
    })
    
    console.log('🎯 Selector discovery v2 complete!')
  }
  
  // Monitor for chat opening
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const inputField = document.querySelector('.lexical-rich-text-input')
        if (inputField && !hasScanned) {
          console.log('🎯 Chat input field detected!')
          setTimeout(scanForSelectors, 1000)
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
    if (inputField && !hasScanned) {
      console.log('🎯 Chat input field detected via interval check!')
      clearInterval(intervalCheck)
      setTimeout(scanForSelectors, 1000)
    }
  }, 1000)
  
  console.log('👀 Monitoring for chat to open... (Open a chat to continue)')
  
} else {
  console.log('❌ Not on WhatsApp Web')
}