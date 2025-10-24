/**
 * Service Worker for AI Consul Lite
 * Orchestrates tab capture, message routing, and state management
 */

// Track capturing tabs for lifecycle management
const capturingTabs = new Set()

/**
 * Ensure offscreen document exists for audio capture
 */
async function ensureOffscreenDocument() {
  const hasDoc = await chrome.offscreen.hasDocument()
  if (hasDoc) return

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Required for live tab audio transcription'
  })
}

/**
 * Start audio capture for the specified tab
 */
async function startCapture(tab) {
  try {
    await ensureOffscreenDocument()

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    })
    
    chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      target: 'offscreen',
      streamId: streamId
    })

    capturingTabs.add(tab.id)
  } catch (error) {
    console.error('Failed to start capture:', error)
    chrome.action.setBadgeText({ text: '', tabId: tab.id })
  }
}

/**
 * Stop audio capture
 */
async function stopCapture(tabId) {
  chrome.runtime.sendMessage({
    type: 'STOP_CAPTURE',
    target: 'offscreen'
  })
  
  if (tabId) {
    capturingTabs.delete(tabId)
    chrome.action.setBadgeText({ text: '', tabId: tabId })
  } else {
    capturingTabs.forEach(id => chrome.action.setBadgeText({ text: '', tabId: id }))
    capturingTabs.clear()
  }
}

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const currentBadge = await chrome.action.getBadgeText({ tabId: tab.id })
    const isCurrentlyListening = currentBadge === 'ON'

    if (isCurrentlyListening) {
      await stopCapture(tab.id)
    } else {
      chrome.action.setBadgeText({ text: '...', tabId: tab.id })
      chrome.action.setBadgeBackgroundColor({ color: '#FA9B3D' })
      await startCapture(tab)
    }
  } catch (error) {
    console.error('Action click error:', error)
    chrome.action.setBadgeText({ text: '', tabId: tab.id })
  }
})

/**
 * Handle messages from content scripts and offscreen document
 */
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'GET_SUGGESTIONS') {
    handleGetSuggestions(msg, sendResponse)
    return true
  }
  
  if (msg.type === 'CAPTURE_STARTED') {
    chrome.action.setBadgeText({ text: 'ON' })
    chrome.action.setBadgeBackgroundColor({ color: '#4688F1' })
  }
  
  if (msg.type === 'MODEL_LOADING') {
    chrome.action.setBadgeText({ text: '...' })
    chrome.action.setBadgeBackgroundColor({ color: '#FA9B3D' })
  }
  
  if (msg.type === 'TRANSCRIPT_READY') {
    console.log('Transcription:', msg.transcript)
    // Save transcript for context merging
    saveRecentTranscript(msg.transcript)
    
    // Send live transcript to content script
    try {
      // Find the active tab that initiated the capture
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tabs.length > 0) {
        const activeTab = tabs[0]
        console.log('Sending live transcript to tab:', activeTab.id)
        
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'LIVE_TRANSCRIPT_UPDATE',
          transcript: msg.transcript,
          timestamp: Date.now()
        }).catch(error => {
          console.log('Could not send transcript to content script:', error.message)
          // This is expected if the content script isn't loaded or the page doesn't support it
        })
      }
    } catch (error) {
      console.error('Error sending transcript to content script:', error)
    }
  }
  
  if (msg.type === 'CAPTURE_ERROR') {
    console.error("Audio Capture Error:", msg.error)
    chrome.action.setBadgeText({ text: "ERR" })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    stopCapture()
  }
})

/**
 * Handle suggestion generation requests
 */
async function handleGetSuggestions(msg, sendResponse) {
  try {
    const { context, tone, provider } = msg
    
    // Get API key
    const result = await chrome.storage.local.get(`api_key_${provider}`)
    const apiKey = result[`api_key_${provider}`]
    
    if (!apiKey) {
      sendResponse({
        type: 'SUGGESTIONS_READY',
        success: false,
        error: 'API key not found. Please configure your API key in the options page.'
      })
      return
    }

    const systemPrompt = `You are a helpful assistant. Provide 2-3 short reply suggestions to the last message in a ${tone} tone. Each suggestion should be concise (1-2 sentences max) and contextually appropriate. Separate each suggestion with '---'.`

    let suggestions
    switch (provider.toLowerCase()) {
      case 'openai':
        suggestions = await callOpenAI(context, systemPrompt, apiKey)
        break
      case 'anthropic':
        suggestions = await callAnthropic(context, systemPrompt, apiKey)
        break
      case 'google':
        suggestions = await callGoogle(context, systemPrompt, apiKey)
        break
      default:
        sendResponse({
          type: 'SUGGESTIONS_READY',
          success: false,
          error: `Unsupported provider: ${provider}`
        })
        return
    }

    if (suggestions.success) {
      // Parse suggestions by splitting on '---'
      const parsedSuggestions = suggestions.data
        .split('---')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 3) // Ensure max 3 suggestions

      sendResponse({
        type: 'SUGGESTIONS_READY',
        success: true,
        suggestions: parsedSuggestions
      })
    } else {
      sendResponse({
        type: 'SUGGESTIONS_READY',
        success: false,
        error: suggestions.error
      })
    }
  } catch (error) {
    console.error('Error handling suggestions request:', error)
    sendResponse({
      type: 'SUGGESTIONS_READY',
      success: false,
      error: error.message
    })
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(context, systemPrompt, apiKey) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 300,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      let errorMessage = `OpenAI API error (${response.status})`
      
      if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your OpenAI API key.'
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
      
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return { success: false, error: 'No response content received from OpenAI' }
    }

    return { success: true, data: content }
  } catch (error) {
    return { success: false, error: `OpenAI Network error: ${error.message}` }
  }
}

/**
 * Call Anthropic API
 */
async function callAnthropic(context, systemPrompt, apiKey) {
  try {
    const messages = context.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        system: systemPrompt,
        messages: messages
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      let errorMessage = `Anthropic API error (${response.status})`
      
      if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your Anthropic API key.'
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
      
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    const content = data.content?.[0]?.text

    if (!content) {
      return { success: false, error: 'No response content received from Anthropic' }
    }

    return { success: true, data: content }
  } catch (error) {
    return { success: false, error: `Anthropic Network error: ${error.message}` }
  }
}

/**
 * Call Google Gemini API
 */
async function callGoogle(context, systemPrompt, apiKey) {
  try {
    // Gemini requires alternating user/model roles
    const contents = []
    
    // Add system instructions if provided
    if (systemPrompt) {
      contents.push({ role: "user", parts: [{ text: systemPrompt }] })
      contents.push({ role: "model", parts: [{ text: "Okay, I understand the instructions." }] })
    }

    // Add conversation history
    context.forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })
    })

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      let errorMessage = `Google API error (${response.status})`
      
      if (response.status === 400) {
        errorMessage = 'Invalid API key. Please check your Google AI API key.'
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
      
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    
    // Handle potential safety blocks
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      return { success: false, error: 'Google API blocked the response due to safety settings.' }
    }
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      return { success: false, error: 'No response content received from Google Gemini' }
    }

    return { success: true, data: content }
  } catch (error) {
    return { success: false, error: `Google API Network error: ${error.message}` }
  }
}

/**
 * Save recent transcript for context merging
 */
async function saveRecentTranscript(transcript, timestamp = Date.now()) {
  try {
    const result = await chrome.storage.sync.get('recentTranscripts')
    const transcripts = result.recentTranscripts || []
    transcripts.unshift({ transcript, timestamp })
    
    // Keep only last 10 transcripts
    const trimmed = transcripts.slice(0, 10)
    await chrome.storage.sync.set({ recentTranscripts: trimmed })
  } catch (error) {
    console.error('Failed to save transcript:', error)
  }
}

/**
 * Handle tab removal
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  if (capturingTabs.has(tabId)) {
    stopCapture(tabId)
  }
})

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (capturingTabs.has(tabId) && changeInfo.url) {
    stopCapture(tabId)
  }
})

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AI Consul Lite installed')
  } else if (details.reason === 'update') {
    console.log('AI Consul Lite updated')
  }
})
