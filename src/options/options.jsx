/**
 * Options Page for AI Consul Lite
 * Handles settings management and API key configuration
 */

import React, { useState, useEffect } from 'react'
import './options.css'

/**
 * Options page component
 */
function OptionsPage() {
  const [settings, setSettings] = useState({
    provider: 'openai',
    apiKey: '',
    defaultTone: 'semi-formal',
    defaultLocalModel: 'llama3:latest',
    voiceEnabled: true,
    extensionEnabled: true
  })
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [availableModels, setAvailableModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
    // Load models if Local provider is selected
    if (settings.provider === 'local') {
      loadAvailableModels()
    }
  }, [settings.provider])

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get([
        'defaultProvider',
        'defaultTone',
        'defaultLocalModel',
        'voiceEnabled',
        'extensionEnabled'
      ])
      
      // Check if API key exists for current provider
      const provider = result.defaultProvider || 'openai'
      const apiKeyResult = await chrome.storage.local.get(`api_key_${provider}`)
      const hasKey = !!apiKeyResult[`api_key_${provider}`]
      
      setSettings(prev => ({
        ...prev,
        provider: provider,
        defaultTone: result.defaultTone || 'semi-formal',
        defaultLocalModel: result.defaultLocalModel || 'llama3:latest',
        voiceEnabled: result.voiceEnabled !== false,
        extensionEnabled: result.extensionEnabled !== false
      }))
      
      setHasApiKey(hasKey)
    } catch (error) {
      console.error('Failed to load settings:', error)
      showStatus('Failed to load settings', 'error')
    }
  }

  const loadAvailableModels = async () => {
    setIsLoadingModels(true)
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      })

      if (response.ok) {
        const data = await response.json()
        const models = data.models?.map(model => model.name) || []
        setAvailableModels(models.sort())
      } else {
        console.log('Could not load models:', response.status)
      }
    } catch (error) {
      console.log('Could not load models from Ollama:', error.message)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Load models when switching to local provider
    if (field === 'provider' && value === 'local') {
      loadAvailableModels()
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setStatusMessage('')

    try {
      // Save API key if provided
      if (settings.apiKey.trim()) {
        await chrome.storage.local.set({ [`api_key_${settings.provider}`]: settings.apiKey.trim() })
      }

      // Save preferences
      await chrome.storage.sync.set({
        defaultProvider: settings.provider,
        defaultTone: settings.defaultTone,
        defaultLocalModel: settings.defaultLocalModel || 'llama3:latest',
        voiceEnabled: settings.voiceEnabled,
        extensionEnabled: settings.extensionEnabled
      })

      showStatus('Settings saved successfully!', 'success')
    } catch (error) {
      console.error('Failed to save settings:', error)
      showStatus('Failed to save settings', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    // For local LLM, we don't need an API key
    if (settings.provider !== 'local' && !settings.apiKey.trim()) {
      showStatus('Please enter an API key first', 'error')
      return
    }

    setIsTestingConnection(true)
    setStatusMessage('')

    try {
      let result
      
      if (settings.provider === 'local') {
        // Test local LLM connection directly
        result = await testLocalConnection()
      } else {
        // Import test function dynamically for other providers
        const { testApiKey } = await import('../lib/llm_service.js')
        result = await testApiKey(settings.provider, settings.apiKey.trim())
      }

      if (result.success) {
        showStatus('Connection successful!', 'success')
      } else {
        showStatus(`Connection failed: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Test connection error:', error)
      showStatus(`Test failed: ${error.message}`, 'error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const testLocalConnection = async () => {
    try {
      // Resolve the model to test with
      const syncVals = await chrome.storage.sync.get(['defaultLocalModel'])
      const modelToTest = settings.defaultLocalModel || syncVals.defaultLocalModel || 'llama3:latest'
      // First, try to check if Ollama is running with a simple API call
      const healthResponse = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors' // Explicitly set CORS mode
      })

      if (!healthResponse.ok) {
        if (healthResponse.status === 403) {
          return { success: false, error: 'Ollama server is running but blocked the request. This is likely a CORS issue. Try running Ollama with: OLLAMA_ORIGINS="*" ollama serve' }
        }
        return { success: false, error: `Ollama server error: ${healthResponse.status} ${healthResponse.statusText}` }
      }

      // If health check passes, try the chat completions endpoint
      const response = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
        body: JSON.stringify({
          model: modelToTest,
          messages: [
            { role: 'user', content: 'Hello, this is a test message.' }
          ],
          max_tokens: 50,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        if (response.status === 403) {
          return { success: false, error: 'Ollama blocked the request due to CORS. Try: OLLAMA_ORIGINS="*" ollama serve' }
        }
        if (response.status === 404) {
          return { success: false, error: `Model not found. Check the model name: ${modelToTest}` }
        }
        const errorData = await response.json().catch(() => ({}))
        return { success: false, error: `Ollama server error: ${errorData.error?.message || response.statusText}` }
      }

      const data = await response.json()
      if (data.choices?.[0]?.message?.content) {
        return { success: true, error: null }
      } else {
        return { success: false, error: 'Invalid response from Ollama server' }
      }
    } catch (error) {
      if (error.message.includes('fetch')) {
        return { success: false, error: 'Cannot connect to Ollama server. Make sure Ollama is running on localhost:11434' }
      }
      if (error.message.includes('CORS')) {
        return { success: false, error: 'CORS error. Try: OLLAMA_ORIGINS="*" ollama serve' }
      }
      return { success: false, error: `Connection test failed: ${error.message}` }
    }
  }

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        await chrome.storage.local.clear()
        await chrome.storage.sync.clear()
        
        setSettings({
          provider: 'openai',
          apiKey: '',
          defaultTone: 'semi-formal',
          voiceEnabled: true,
          extensionEnabled: true
        })
        
        showStatus('Settings reset to defaults', 'success')
      } catch (error) {
        console.error('Failed to reset settings:', error)
        showStatus('Failed to reset settings', 'error')
      }
    }
  }

  const showStatus = (message, type) => {
    setStatusMessage(message)
    setTimeout(() => setStatusMessage(''), 5000)
  }

  return (
    <div className="container">
      <header>
        <h1>AI Consul Lite Settings</h1>
        <p>Configure your AI assistant preferences and API keys</p>
      </header>

      <main>
        <section className="settings-section">
          <h2>LLM Provider</h2>
          <div className="form-group">
            <label htmlFor="provider-select">Choose your preferred AI provider:</label>
            <select 
              id="provider-select" 
              value={settings.provider}
              onChange={(e) => handleInputChange('provider', e.target.value)}
              disabled={isLoading}
            >
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="google">Google (Gemini Pro)</option>
              <option value="local">Local LLM (Ollama)</option>
            </select>
          </div>
        </section>

        {settings.provider === 'local' && (
          <section className="settings-section">
            <h2>Local LLM Setup</h2>
            <div className="form-group">
              <div className="info-box">
                <h3>🚀 Using Local LLM (Ollama)</h3>
                <p>Your extension will connect to a local Ollama server running on your computer.</p>
                <ul>
                  <li><strong>No API key required</strong> - completely private and free</li>
                  <li><strong>Offline capable</strong> - works without internet</li>
                  <li><strong>Fast responses</strong> - no network latency</li>
                </ul>
                <h4>Setup Instructions:</h4>
                <ol>
                  <li>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">ollama.com</a></li>
                  <li>Run: <code>ollama pull llama3:8b</code> (or any model you prefer)</li>
                  <li>Start Ollama (usually runs automatically)</li>
                  <li>Test the connection below</li>
                </ol>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="default-local-model">Default Local Model</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  id="default-local-model"
                  value={settings.defaultLocalModel}
                  onChange={(e) => handleInputChange('defaultLocalModel', e.target.value)}
                  disabled={isLoading || isLoadingModels}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="">Select a model...</option>
                  {availableModels.length > 0 ? (
                    availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))
                  ) : (
                    <option value="">No models found. Load models first.</option>
                  )}
                </select>
                <button
                  onClick={loadAvailableModels}
                  disabled={isLoadingModels}
                  style={{
                    padding: '8px 16px',
                    background: '#4688F1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title="Load models from Ollama"
                >
                  {isLoadingModels ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              <small className="help-text">
                {availableModels.length > 0 
                  ? `Found ${availableModels.length} model(s). Select one from the dropdown.`
                  : 'Click "Refresh" to load available models from your Ollama server.'}
              </small>
            </div>
            <button 
              id="test-local-button" 
              className="secondary-button"
              onClick={handleTestConnection}
              disabled={isLoading || isTestingConnection}
            >
              {isTestingConnection ? 'Testing...' : 'Test Local Connection'}
            </button>
          </section>
        )}

        {settings.provider !== 'local' && (
          <section className="settings-section">
            <h2>API Key</h2>
            <div className="form-group">
              <label htmlFor="api-key-input">Enter your API key:</label>
              <input 
                type="password" 
                id="api-key-input" 
                value={settings.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder={hasApiKey ? "•••••••• (API key saved)" : "Your API key will be stored securely"}
                disabled={isLoading}
              />
              <small className="help-text">
                {hasApiKey ? "API key is saved. Enter a new key to replace it." : "Your API key is encrypted and stored locally. We never see your key."}
              </small>
            </div>
            <button 
              id="test-key-button" 
              className="secondary-button"
              onClick={handleTestConnection}
              disabled={isLoading || isTestingConnection || !settings.apiKey.trim()}
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </section>
        )}

        <section className="settings-section">
          <h2>Default Settings</h2>
          <div className="form-group">
            <label htmlFor="tone-select">Default tone for suggestions:</label>
            <select 
              id="tone-select" 
              value={settings.defaultTone}
              onChange={(e) => handleInputChange('defaultTone', e.target.value)}
              disabled={isLoading}
            >
              <option value="formal">Formal</option>
              <option value="semi-formal">Semi-formal</option>
              <option value="friendly">Friendly</option>
              <option value="slang">Slang</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h2>Voice Transcription</h2>
          <div className="form-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                id="voice-enabled" 
                checked={settings.voiceEnabled}
                onChange={(e) => handleInputChange('voiceEnabled', e.target.checked)}
                disabled={isLoading}
              />
              Enable voice transcription for video calls
            </label>
            <small className="help-text">Automatically transcribe audio from Google Meet, Zoom, and other video platforms</small>
          </div>
        </section>

        <section className="settings-section">
          <h2>Privacy</h2>
          <div className="form-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                id="extension-enabled" 
                checked={settings.extensionEnabled}
                onChange={(e) => handleInputChange('extensionEnabled', e.target.checked)}
                disabled={isLoading}
              />
              Enable AI Consul Lite
            </label>
            <small className="help-text">Master toggle to enable/disable the extension</small>
          </div>
        </section>

        <div className="actions">
          <button 
            id="save-button" 
            className="primary-button"
            onClick={handleSave}
            disabled={isLoading}
          >
            Save Settings
          </button>
          <button 
            id="reset-button" 
            className="secondary-button"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset to Defaults
          </button>
        </div>

        {statusMessage && (
          <div className={`status-message ${statusMessage.includes('success') ? 'success' : 'error'}`}>
            {statusMessage}
          </div>
        )}
      </main>

      <footer>
        <p>AI Consul Lite v1.0.0 - Privacy-first AI assistant</p>
      </footer>
    </div>
  )
}

export default OptionsPage
