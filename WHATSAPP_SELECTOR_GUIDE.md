# WhatsApp Web Selector Discovery Guide

## How to Find Updated Selectors

### Step 1: Run the Selector Discovery Script
1. Reload the extension in Chrome (`chrome://extensions/` → reload button)
2. Open WhatsApp Web
3. Open browser console (F12 → Console tab)
4. Look for the selector discovery logs

### Step 2: Manual Inspection (if needed)
If the script doesn't find the right selectors, you can manually inspect:

1. **Find the Input Field:**
   - Right-click in the message input area (where you type messages)
   - Select "Inspect Element"
   - Look for attributes like:
     - `data-testid="..."`
     - `contenteditable="true"`
     - `aria-label="..."`
     - `placeholder="..."`
     - `role="textbox"`

2. **Find Message Container:**
   - Right-click on any message in the chat
   - Select "Inspect Element"
   - Navigate up the DOM tree to find the container holding all messages
   - Look for attributes like:
     - `data-testid="..."`
     - `role="log"`
     - `aria-label="..."`
     - Classes containing "message", "chat", "conversation"

3. **Find Individual Messages:**
   - Right-click on a specific message
   - Look for attributes that distinguish messages
   - Check for outgoing vs incoming message indicators

### Step 3: Common WhatsApp Web Patterns
WhatsApp Web commonly uses these patterns:

**Input Field:**
- `[data-testid*="compose"]`
- `[data-testid*="input"]`
- `[contenteditable="true"]`
- `[role="textbox"]`

**Message Container:**
- `[data-testid*="messages"]`
- `[data-testid*="conversation"]`
- `[role="log"]`

**Individual Messages:**
- `[data-testid*="msg"]`
- `[data-testid*="message"]`
- `.message` (class)

**Outgoing vs Incoming:**
- Look for `data-testid` attributes that indicate direction
- Check for classes like `message-out`, `message-in`, `sent`, `received`

### Step 4: Test Selectors
Once you find potential selectors, test them in the console:
```javascript
// Test input field
document.querySelector('[your-selector-here]')

// Test message container
document.querySelector('[your-message-container-selector]')

// Test individual messages
document.querySelectorAll('[your-message-selector]')
```

### Step 5: Update the Platform Adapter
Once you have the correct selectors, update `src/lib/platform_adapter.js`:

```javascript
const whatsappAdapter = {
  name: 'WhatsApp',
  inputSelector: '[your-new-input-selector]',
  messageSelector: '[your-new-message-selector]',
  
  getMessageText(node) {
    // Update this to extract text from the new message structure
  },
  
  getMessageRole(node) {
    // Update this to determine if message is outgoing or incoming
  },
  
  insertText(text) {
    // Update this to insert text into the new input structure
  }
}
```

## Current Known Issues
- `[data-testid="conversation-compose-box-input"]` - Not found
- `[data-testid="conversation-panel-messages"]` - Not found
- `[data-testid="msg-container"]` - Not found

## Next Steps
1. Run the selector discovery script
2. Check console logs for found selectors
3. Update platform adapter with new selectors
4. Test the extension functionality
