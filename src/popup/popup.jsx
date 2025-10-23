/**
 * Popup Page for AI Consul Lite
 * Handles extension state management and quick settings
 */

import React, { useState, useEffect } from 'react'
import './popup.css'

/**
 * Popup component
 */
function PopupPage() {
  const [settings, setSettings] = useState({
    extensionEnabled: true,
    siteEnabled: true,
    voiceEnabled: true
  })
  const [currentSite, setCurrentSite] = useState('Loading...')
  const [isLoading, setIsLoading] = useState(true)

  // Load settings and current tab info on mount
  useEffect(() => {
    loadSettings()
    loadCurrentTab()
    
    // Listen for storage changes to update UI live
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'sync') {
        // Reload settings when sync storage changes
        loadSettings()
      }
    }
    
    chrome.storage.onChanged.addListener(handleStorageChange)
    
    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const loadSettings = async () => {
    try {
      const [extensionResult, voiceResult] = await Promise.all([
        chrome.storage.sync.get(['extensionEnabled', 'siteStates']),
        chrome.storage.sync.get('voiceEnabled')
      ])

      // Get current tab hostname for site state
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const hostname = tab ? new URL(tab.url).hostname : ''
      const siteEnabled = extensionResult.siteStates?.[hostname] !== false

      setSettings({
        extensionEnabled: extensionResult.extensionEnabled !== false,
        siteEnabled: siteEnabled,
        voiceEnabled: voiceResult.voiceEnabled !== false
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab) {
        const url = new URL(tab.url)
        setCurrentSite(url.hostname)
      }
    } catch (error) {
      console.error('Failed to get current tab:', error)
      setCurrentSite('Unknown')
    }
  }

  const handleToggle = async (setting, value) => {
    try {
      if (setting === 'extensionEnabled') {
        await chrome.storage.sync.set({ extensionEnabled: value })
      } else if (setting === 'voiceEnabled') {
        await chrome.storage.sync.set({ voiceEnabled: value })
      } else if (setting === 'siteEnabled') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab) {
          const hostname = new URL(tab.url).hostname
          const siteStates = await chrome.storage.sync.get('siteStates')
          const updatedStates = { ...siteStates.siteStates }
          updatedStates[hostname] = value
          await chrome.storage.sync.set({ siteStates: updatedStates })
        }
      }

      setSettings(prev => ({
        ...prev,
        [setting]: value
      }))

      // Notify content script of changes
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab) {
          chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_CHANGED' })
        }
      } catch (error) {
        // Content script might not be loaded, that's okay
        console.log('Could not notify content script:', error)
      }
    } catch (error) {
      console.error(`Failed to update ${setting}:`, error)
    }
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  const getStatusText = () => {
    if (!settings.extensionEnabled) return 'Disabled'
    if (!settings.siteEnabled) return 'Disabled on this site'
    if (settings.voiceEnabled) return 'Voice + Chat active'
    return 'Chat only'
  }

  const getStatusClass = () => {
    if (!settings.extensionEnabled || !settings.siteEnabled) return 'disabled'
    return 'active'
  }

  if (isLoading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      <header>
        <h1>AI Consul Lite</h1>
        <div className={`status-indicator ${getStatusClass()}`}>
          <span className="status-dot"></span>
          <span className="status-text">{getStatusText()}</span>
        </div>
      </header>

      <main>
        <div className="toggle-section">
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={settings.extensionEnabled}
              onChange={(e) => handleToggle('extensionEnabled', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Enable Extension</span>
          </label>
        </div>

        <div className="toggle-section">
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={settings.siteEnabled}
              onChange={(e) => handleToggle('siteEnabled', e.target.checked)}
              disabled={!settings.extensionEnabled}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Enable on this site</span>
          </label>
        </div>

        <div className="toggle-section">
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={settings.voiceEnabled}
              onChange={(e) => handleToggle('voiceEnabled', e.target.checked)}
              disabled={!settings.extensionEnabled}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Voice transcription</span>
          </label>
        </div>

        <div className="current-site">
          <span className="site-label">Current site:</span>
          <span className="site-name">{currentSite}</span>
        </div>

        <div className="actions">
          <button 
            className="options-button"
            onClick={handleOpenOptions}
          >
            Settings
          </button>
        </div>
      </main>

        <footer>
          <p>Voice capture toggled via icon click on supported pages</p>
        </footer>
    </div>
  )
}

export default PopupPage
