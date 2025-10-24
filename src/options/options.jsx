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
    voiceEnabled: true,
    extensionEnabled: true
  })
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get([
        'defaultProvider',
        'defaultTone',
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
        voiceEnabled: result.voiceEnabled !== false,
        extensionEnabled: result.extensionEnabled !== false
      }))
      
      setHasApiKey(hasKey)
    } catch (error) {
      console.error('Failed to load settings:', error)
      showStatus('Failed to load settings', 'error')
    }
  }

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
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
    if (!settings.apiKey.trim()) {
      showStatus('Please enter an API key first', 'error')
      return
    }

    setIsTestingConnection(true)
    setStatusMessage('')

    try {
      // Import test function dynamically
      const { testApiKey } = await import('../lib/llm_service.js')
      const result = await testApiKey(settings.provider, settings.apiKey.trim())

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
