# Testing Guide for AI Consul Lite Updates

## What Was Just Implemented

### ✅ Local Model Selection
The extension now allows you to choose which Ollama model to use by default.

**How to Test:**
1. Go to the extension options page (`chrome://extensions` → AI Consul Lite → Options)
2. Select "Local LLM (Ollama)" from the provider dropdown
3. You should now see a new field: "Default Local Model Name"
4. Enter your preferred model (e.g., `llama3:latest`, `llama3.1:8b`, `phi3:mini`)
5. Click "Save Settings"
6. Click "Test Local Connection" to verify it works with your selected model

**What Changed:**
- Options page now shows "Default Local Model Name" input when Local provider is selected
- The extension uses this model for all suggestions
- Error messages will show which specific model failed (e.g., "Model not found. Check the model name: llama3.1:8b")

### 📝 File Changes
- `src/options/options.jsx`: Added model input field
- `src/lib/llm_service.js`: Added model resolution from storage
- `src/background/service-worker.js`: Uses resolved model for Ollama calls

## Recent Enhancements

### Role Inversion Fix (Previously Implemented)
- Fixed the bug where AI was generating continuations instead of replies
- Incoming messages are now correctly labeled as 'user' role
- Outgoing messages are correctly labeled as 'assistant' role

**How to Test:**
1. Go to WhatsApp Web
2. Have someone send you "Спасибо" (Russian for "Thank you")
3. Click the AI icon to generate suggestions
4. You should see proper replies like "Не за что" (You're welcome) instead of continuations

## Next Steps (Planned)

These features are designed but not yet implemented:

1. **Streaming Output**: Suggestions will appear in real-time as they're generated
2. **Sidebar UI**: A persistent panel for more advanced features
3. **Page Context**: Include page content for better suggestions
4. **Context Menu**: Right-click selected text for quick actions

## Troubleshooting

### "Ollama blocked the request due to CORS"
If you see this error:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

Or check your `~/.ollama/config` file includes:
```
OLLAMA_ORIGINS="*"
```

### "Model not found"
Make sure the model name matches what you have installed:
```bash
ollama list
```

Common models: `llama3:latest`, `llama3.1:8b`, `phi3:mini`

### Extension Not Updating
1. Go to `chrome://extensions`
2. Find "AI Consul Lite"
3. Click the reload icon (circular arrow)
4. Refresh the page you're testing on

## Testing Checklist

- [ ] Model selection in options page works
- [ ] Saved model name persists after reload
- [ ] Connection test uses the correct model
- [ ] Error messages show the model name being used
- [ ] Chat suggestions work with WhatsApp
- [ ] Role inversion produces proper replies (not continuations)
- [ ] All existing features still work (voice transcription, etc.)

