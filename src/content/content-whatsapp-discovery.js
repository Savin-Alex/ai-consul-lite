// WhatsApp Selector Discovery Script v11
// Comprehensive discovery of current WhatsApp Web DOM structure

console.log('🔍 WhatsApp Selector Discovery Script Loading...');

// Wait for page to be ready
function waitForReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

// Comprehensive selector discovery
function discoverWhatsAppElements() {
  console.log('🔍 Starting comprehensive WhatsApp element discovery...');
  
  // All possible input selectors to test
  const inputSelectors = [
    // Current selectors
    'div[data-testid="conversation-compose-box-input"]',
    '.lexical-rich-text-input[data-testid*="compose"]',
    '.lexical-rich-text-input div[contenteditable="true"][role="textbox"]:not([aria-label*="Search"])',
    
    // Alternative patterns
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[data-testid*="input"]',
    '[data-testid*="compose"]',
    '[data-testid*="message"]',
    '[aria-label*="message"]',
    '[aria-label*="compose"]',
    '[aria-label*="type"]',
    '[placeholder*="message"]',
    '[placeholder*="type"]',
    
    // Class-based patterns
    '.compose-box',
    '.input-box',
    '.message-input',
    '.compose-input',
    '.rich-text-input',
    '.text-input',
    
    // More specific patterns
    'div[contenteditable="true"]:not([aria-label*="Search"])',
    'div[role="textbox"]:not([aria-label*="Search"])',
    'div[data-testid*="input"]:not([aria-label*="Search"])',
  ];

  // All possible message selectors
  const messageSelectors = [
    '[data-testid="conversation-panel-messages"]',
    '[data-testid="msg-container"]',
    '[data-testid*="message"]',
    '.message-list',
    '.messages-container',
    '.chat-messages',
    '.conversation-messages',
    '[role="log"]',
    '[aria-label*="message"]',
    '.message',
    '.msg',
    '[role="listitem"]',
    '.chat-message',
    '.conversation-message',
  ];

  console.log('📝 Testing input selectors:');
  inputSelectors.forEach((selector, index) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} element(s) with selector: ${selector}`);
      elements.forEach((el, i) => {
        console.log(`   Element ${i + 1}:`, {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          'data-testid': el.getAttribute('data-testid'),
          'aria-label': el.getAttribute('aria-label'),
          'aria-placeholder': el.getAttribute('aria-placeholder'),
          contenteditable: el.getAttribute('contenteditable'),
          role: el.getAttribute('role'),
          placeholder: el.getAttribute('placeholder'),
          innerHTML: el.innerHTML.substring(0, 100) + '...'
        });
      });
    } else {
      console.log(`❌ No elements found with selector: ${selector}`);
    }
  });

  console.log('💬 Testing message selectors:');
  messageSelectors.forEach((selector, index) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} element(s) with selector: ${selector}`);
      elements.forEach((el, i) => {
        console.log(`   Element ${i + 1}:`, {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          'data-testid': el.getAttribute('data-testid'),
          'aria-label': el.getAttribute('aria-label'),
          childCount: el.children.length
        });
      });
    } else {
      console.log(`❌ No elements found with selector: ${selector}`);
    }
  });

  // Look for any elements with compose/input/message related attributes
  console.log('🔍 Scanning for compose/input/message related elements...');
  const allElements = document.querySelectorAll('*');
  const relevantElements = [];
  
  allElements.forEach(el => {
    const testId = el.getAttribute('data-testid');
    const ariaLabel = el.getAttribute('aria-label');
    const className = el.className;
    const role = el.getAttribute('role');
    const contenteditable = el.getAttribute('contenteditable');
    
    if (
      (testId && (testId.includes('input') || testId.includes('compose') || testId.includes('message'))) ||
      (ariaLabel && (ariaLabel.toLowerCase().includes('message') || ariaLabel.toLowerCase().includes('compose') || ariaLabel.toLowerCase().includes('type'))) ||
      (className && (className.includes('input') || className.includes('compose') || className.includes('message'))) ||
      (role === 'textbox') ||
      (contenteditable === 'true')
    ) {
      relevantElements.push({
        element: el,
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        'data-testid': testId,
        'aria-label': ariaLabel,
        'aria-placeholder': el.getAttribute('aria-placeholder'),
        contenteditable: contenteditable,
        role: role,
        placeholder: el.getAttribute('placeholder')
      });
    }
  });

  if (relevantElements.length > 0) {
    console.log(`🔍 Found ${relevantElements.length} elements with compose/input/message related attributes:`);
    relevantElements.forEach((item, index) => {
      console.log(`   Element ${index + 1}:`, item);
    });
  } else {
    console.log('❌ No elements found with compose/input/message related attributes');
  }

  // Check if we're in a chat context
  console.log('🔍 Checking chat context...');
  const url = window.location.href;
  console.log(`📍 Current URL: ${url}`);
  
  // Look for chat-specific indicators
  const chatIndicators = [
    'div[data-testid*="chat"]',
    'div[data-testid*="conversation"]',
    'div[data-testid*="panel"]',
    '.chat',
    '.conversation',
    '.panel'
  ];
  
  chatIndicators.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} chat indicator(s) with selector: ${selector}`);
    }
  });

  console.log('🎯 Selector discovery complete! Check the logs above for potential selectors.');
}

// Run discovery when page is ready
waitForReady().then(() => {
  console.log('✅ WhatsApp Web detected - Starting selector discovery...');
  discoverWhatsAppElements();
  
  // Also run discovery after a delay to catch dynamically loaded content
  setTimeout(() => {
    console.log('🔄 Running delayed discovery...');
    discoverWhatsAppElements();
  }, 3000);
});

// Export for manual testing
window.whatsappDiscovery = {
  discover: discoverWhatsAppElements,
  run: () => discoverWhatsAppElements()
};
