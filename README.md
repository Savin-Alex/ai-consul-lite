# AI Consul Lite - Browser Extension

A privacy-first browser-based AI copilot for professionals, students, and job seekers. AI Consul Lite offers real-time answer suggestions by connecting directly to your preferred cloud LLM (GPT-4o, Claude 3, Gemini) using your own API key.

## Features

- **Real-Time Voice Transcription**: Live transcription of video calls using bundled Whisper-tiny.en model
- **Smart Chat Suggestions**: Context-aware reply suggestions for text chats
- **Tone Selection**: Choose from Formal, Semi-formal, Friendly, or Slang tones
- **Privacy-First**: Your conversations never leave your browser
- **BYOK Model**: Bring Your Own Key - use your own API keys for LLM providers

## Supported Platforms

- WhatsApp Web
- Telegram Web
- Slack Web
- Discord
- LinkedIn Chat
- Messenger.com
- Google Chat
- Google Meet (voice transcription)
- Zoom Web (voice transcription)

## Current Status

✅ **Extension Built Successfully!** 

The extension is now ready for testing. All core functionality is implemented:
- ✅ Service worker with audio capture and message routing
- ✅ Content scripts with platform adapters for all supported platforms
- ✅ React UI with Shadow DOM mounting
- ✅ LLM service supporting OpenAI, Anthropic, and Google Gemini
- ✅ Offscreen document for audio capture with loopback fix
- ✅ Whisper worker for speech-to-text transcription
- ✅ Extension icons and manifest (with proper icon files)
- ✅ Build system working correctly

⚠️ **Note:** Voice transcription requires downloading the Whisper model files (see step 1 below).

## Setup Instructions

### 1. Download Whisper Model

Before building the extension, you need to download the Whisper-tiny.en model:

**Option A: Automated Download (Recommended)**
```bash
# Run the improved download script
node download-model.cjs
```

**Option B: Manual Download**
```bash
# Create the models directory
mkdir -p src/assets/models/whisper-tiny.en

# Download the model files manually from HuggingFace
# Go to: https://huggingface.co/Xenova/whisper-tiny.en
# Download all files and place them in src/assets/models/whisper-tiny.en/
```

Required files:
- `config.json`
- `tokenizer.json`
- `onnx/model.onnx`
- `merges.txt`
- `vocab.json`
- `preprocessor_config.json`
- `tokenizer_config.json`
- `special_tokens_map.json`

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Extension

```bash
npm run build
```

### 4. Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. The extension should now appear in your extensions list

**Note:** If you get an error about `_commonjsHelpers.js`, run `npm run build` again - this file is automatically removed during the build process.

### 5. Test the Extension

1. **Configure API Key**: Click the extension icon → Settings → Enter your API key
2. **Test Chat Suggestions**: Visit WhatsApp Web, Telegram Web, or Slack and look for the 🤖 icon
3. **Test Voice Transcription**: Visit Google Meet or Zoom and click the extension icon to start/stop capture

**Supported Platforms:**
- WhatsApp Web, Telegram Web, Slack, Discord
- LinkedIn Chat, Messenger.com, Google Chat  
- Google Meet, Zoom (voice transcription)

## Development

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

## Configuration

1. Click the extension icon to open the popup
2. Click "Settings" to configure:
   - LLM provider (OpenAI, Anthropic, Google)
   - API key
   - Default tone
   - Voice transcription settings

## Privacy

- All API keys are stored locally and encrypted by Chrome
- No data is sent to our servers
- Voice transcription happens entirely in your browser
- Chat context is processed locally before being sent to your chosen LLM

## API Keys

You'll need API keys from one or more of these providers:

- **OpenAI**: Get your key from https://platform.openai.com/api-keys
- **Anthropic**: Get your key from https://console.anthropic.com/
- **Google**: Get your key from https://makersuite.google.com/app/apikey

## Architecture

- **Service Worker**: Orchestrates tab capture and message routing
- **Offscreen Document**: Handles audio capture with loopback fix
- **Web Worker**: Runs Whisper ONNX model for transcription
- **Content Script**: Detects chat interfaces and injects UI
- **React UI**: Shadow DOM-based reply panel
- **Platform Adapters**: Handle different messaging platforms

## Troubleshooting

### Voice Transcription Not Working
- Ensure you're on a supported video platform (Google Meet, Zoom)
- Check that the extension has permission to capture tab audio
- Verify the Whisper model files are properly downloaded

### Chat Suggestions Not Appearing
- Check that you're on a supported messaging platform
- Verify your API key is correctly configured
- Ensure the extension is enabled for the current site

### Extension Not Loading
- Check that all dependencies are installed
- Verify the Whisper model files are present
- Check the browser console for errors

## License

MIT License - see LICENSE file for details.
