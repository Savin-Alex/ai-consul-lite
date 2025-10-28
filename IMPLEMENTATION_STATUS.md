# AI Consul Lite Implementation Status

## Completed Features ✅

### 1. Local Model Selection (Just Implemented)
- **Options Page Enhancement**: Added "Default Local Model" text input field
- **Storage**: Saves `defaultLocalModel` to `chrome.storage.sync`
- **Service Worker**: Resolves model as `sessionLocalModel || defaultLocalModel || 'llama3:latest'`
- **Connection Test**: Uses the selected model when testing Ollama connection
- **Error Messages**: Include the specific model name being used

**Files Modified:**
- `src/options/options.jsx`: Added model input field and save logic
- `src/lib/llm_service.js`: Added model resolution from storage
- `src/background/service-worker.js`: Added model resolution for local LLM calls

## In Progress 🚧

### 2. Streaming Support (Just Started)
- **Streaming Module Created**: `src/lib/streaming.js` with support for all providers
  - OpenAI streaming with SSE parsing
  - Anthropic streaming with event parsing
  - Google streaming with streamGenerateContent
  - Ollama streaming with delta parsing
  
**Next Steps:**
- Add port-based communication in service worker
- Update ReplyPanel.jsx to handle incremental rendering
- Implement fallback to non-streaming if streaming fails

## Planned Features 📋

### 3. Sidebar UI
- Create Sidebar.jsx and sidebar.css
- Add toggle between Panel and Sidebar modes
- Store `uiMode` preference in `chrome.storage.sync`

### 4. Page Context Scraping
- Add `getCurrentPageContent()` to platform_adapter.js
- Wire into content script with "Use page context" toggle
- Truncate to prevent prompt bloat

### 5. Context Menu Actions
- Create context menus in service worker on install
- Add actions: Explain, Summarize, Translate, Rewrite
- Route to streaming generator with action-specific prompts

## Technical Notes

### Storage Keys
- `defaultLocalModel`: Default model for Ollama (e.g., "llama3:latest")
- `sessionLocalModel`: Per-session model override (ephemeral)
- `uiMode`: Panel or sidebar preference
- `usePageContext`: Default state for page context feature

### Streaming Protocol
- Port-based communication for long-lived connections
- Chunk messages: `{ type: 'SUGGESTIONS_CHUNK', chunk, requestId }`
- Done messages: `{ type: 'SUGGESTIONS_DONE', success, error?, requestId }`

### Model Resolution Priority
1. `sessionLocalModel` (ephemeral override in chrome.storage.local)
2. `defaultLocalModel` (user preference in chrome.storage.sync)
3. `'llama3:latest'` (hardcoded fallback)

## Testing Checklist

- [ ] Test model selection in options page
- [ ] Test Ollama connection with different models
- [ ] Test streaming for all providers
- [ ] Test fallback to non-streaming
- [ ] Test sidebar toggle
- [ ] Test page context scraping
- [ ] Test context menu actions
- [ ] Test all existing functionality still works

