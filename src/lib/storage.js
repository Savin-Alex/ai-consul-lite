/**
 * Storage module for AI Consul Lite
 * Handles chrome.storage.local (API keys) and chrome.storage.sync (preferences)
 */

// API Keys - stored in chrome.storage.local (encrypted on disk)
export async function saveKey(provider, key) {
  try {
    await chrome.storage.local.set({ [`api_key_${provider}`]: key })
    return { success: true }
  } catch (error) {
    console.error('Failed to save API key:', error)
    return { success: false, error: error.message }
  }
}

export async function getKey(provider) {
  try {
    const result = await chrome.storage.local.get(`api_key_${provider}`)
    return result[`api_key_${provider}`] || null
  } catch (error) {
    console.error('Failed to get API key:', error)
    return null
  }
}

// User Preferences - stored in chrome.storage.sync (syncs across browsers)
export async function savePref(key, value) {
  try {
    await chrome.storage.sync.set({ [key]: value })
    return { success: true }
  } catch (error) {
    console.error('Failed to save preference:', error)
    return { success: false, error: error.message }
  }
}

export async function getPref(key, defaultValue = null) {
  try {
    const result = await chrome.storage.sync.get(key)
    return result[key] !== undefined ? result[key] : defaultValue
  } catch (error) {
    console.error('Failed to get preference:', error)
    return defaultValue
  }
}

// Extension State Management
export async function getExtensionState() {
  return await getPref('extensionEnabled', true)
}

export async function setExtensionState(enabled) {
  return await savePref('extensionEnabled', enabled)
}

// Per-site State Management
export async function getSiteState(hostname) {
  const siteStates = await getPref('siteStates', {})
  return siteStates[hostname] !== undefined ? siteStates[hostname] : true
}

export async function setSiteState(hostname, enabled) {
  const siteStates = await getPref('siteStates', {})
  siteStates[hostname] = enabled
  return await savePref('siteStates', siteStates)
}

// Tone Management
export async function getDefaultTone() {
  return await getPref('defaultTone', 'semi-formal')
}

export async function setDefaultTone(tone) {
  return await savePref('defaultTone', tone)
}

// Provider Management
export async function getDefaultProvider() {
  return await getPref('defaultProvider', 'openai')
}

export async function setDefaultProvider(provider) {
  return await savePref('defaultProvider', provider)
}

// Voice Transcription State
export async function getVoiceEnabled() {
  return await getPref('voiceEnabled', true)
}

export async function setVoiceEnabled(enabled) {
  return await savePref('voiceEnabled', enabled)
}

// Recent Transcripts (for context merging)
export async function saveRecentTranscript(transcript, timestamp = Date.now()) {
  try {
    const transcripts = await getPref('recentTranscripts', [])
    transcripts.unshift({ transcript, timestamp })
    // Keep only last 10 transcripts
    const trimmed = transcripts.slice(0, 10)
    await savePref('recentTranscripts', trimmed)
    return { success: true }
  } catch (error) {
    console.error('Failed to save transcript:', error)
    return { success: false, error: error.message }
  }
}

export async function getRecentTranscripts(maxAge = 300000) { // 5 minutes default
  try {
    const transcripts = await getPref('recentTranscripts', [])
    const cutoff = Date.now() - maxAge
    return transcripts.filter(t => t.timestamp > cutoff)
  } catch (error) {
    console.error('Failed to get recent transcripts:', error)
    return []
  }
}

// Clear all data (for debugging/reset)
export async function clearAllData() {
  try {
    await chrome.storage.local.clear()
    await chrome.storage.sync.clear()
    return { success: true }
  } catch (error) {
    console.error('Failed to clear data:', error)
    return { success: false, error: error.message }
  }
}
