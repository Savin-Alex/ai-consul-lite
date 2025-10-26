/**
 * Service Worker for AI Consul Lite
 * Orchestrates tab capture, message routing, and state management
 */

// Ensure service worker stays active
console.log('🚀 Service Worker starting...')

// Keep service worker alive by responding to any message
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Service Worker started on browser startup')
})

chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Service Worker installed/updated')
})

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

    // Get the stream ID from the active tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    })
    
    // Send the streamId to the offscreen document
    chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      target: 'offscreen',
      streamId: streamId
    })

    // Track this tab
    capturingTabs.add(tab.id)
  } catch (error) {
    console.error('Failed to start capture:', error)
    // Reset badge on error
    chrome.action.setBadgeText({ text: '', tabId: tab.id })
  }
}

/**
 * Stop audio capture for the specified tab or all tabs
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
    // If called generally, clear all badges and tracking
    capturingTabs.forEach(id => chrome.action.setBadgeText({ text: '', tabId: id }))
    capturingTabs.clear()
  }
}

// Main action click handler with robust state management
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const currentBadge = await chrome.action.getBadgeText({ tabId: tab.id })
    const isCurrentlyListening = currentBadge === 'ON'

    if (isCurrentlyListening) {
      // User wants to STOP
      await stopCapture(tab.id)
    } else {
      // User wants to START
      // Show immediate feedback that we are 'loading'
      chrome.action.setBadgeText({ text: '...', tabId: tab.id })
      chrome.action.setBadgeBackgroundColor({ color: '#FA9B3D' })
      await startCapture(tab)
    }
  } catch (error) {
    console.error('Action click error:', error)
    // Reset badge on error
    chrome.action.setBadgeText({ text: '', tabId: tab.id })
  }
})

// Message router - handles messages from content scripts and offscreen document
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('📨 Background script received message:', msg)
  console.log('🔍 Message type:', msg.type)
  console.log('📤 Sender:', sender)
  console.log('🔍 sendResponse function:', typeof sendResponse)
  
  if (msg.type === 'GET_SUGGESTIONS') {
    console.log('🔄 Processing GET_SUGGESTIONS request:', msg)
    console.log('📝 Message content:', JSON.stringify(msg, null, 2))
    
    // Handle LLM suggestion requests from content scripts asynchronously
    handleGetSuggestions(msg, sendResponse).catch(error => {
      console.error('❌ Unhandled error in handleGetSuggestions:', error)
    })
    
    // Return true to keep the message channel open for async response
    return true
  }
  
  if (msg.type === 'PING') {
    console.log('🏓 Received PING, sending PONG')
    const pongResponse = { type: 'PONG', message: 'Service worker is active' }
    console.log('📤 Sending PONG:', pongResponse)
    sendResponse(pongResponse)
    return true
  }
  
  if (msg.type === 'KEEP_ALIVE') {
    console.log('💓 Keep-alive ping received')
    // Just receiving the message is enough to reset the timer
    sendResponse(true) // Acknowledge
    return true
  }
  
  if (msg.type === 'CAPTURE_STARTED') {
    // Audio capture is now active
    chrome.action.setBadgeText({ text: 'ON' })
    chrome.action.setBadgeBackgroundColor({ color: '#4688F1' })
    return false
  }
  
  if (msg.type === 'MODEL_LOADING') {
    // Model is loading
    chrome.action.setBadgeText({ text: '...' })
    chrome.action.setBadgeBackgroundColor({ color: '#FA9B3D' })
    return false
  }
  
  if (msg.type === 'TRANSCRIPT_READY') {
    console.log('Transcription:', msg.transcript)
    // Save transcript for context merging (simplified version) - async, no response needed
    ;(async () => {
      try {
        const transcripts = (await chrome.storage.sync.get('recentTranscripts')).recentTranscripts || []
        transcripts.unshift({ transcript: msg.transcript, timestamp: Date.now() })
        const trimmed = transcripts.slice(0, 10)
        await chrome.storage.sync.set({ recentTranscripts: trimmed })
      } catch (error) {
        console.error('Failed to save transcript:', error)
      }
    })()
    return false
  }
  
  if (msg.type === 'CAPTURE_ERROR') {
    console.error("Audio Capture Error:", msg.error)
    chrome.action.setBadgeText({ text: "ERR" })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    // Clean up state
    stopCapture()
    return false
  }
  
  // If we reach here, it's an unhandled message type
  return false
})

/**
 * Handle LLM suggestion requests
 */
async function handleGetSuggestions(msg, sendResponse) {
  // This function is called asynchronously, so we need to track if response was sent
  let responseSent = false
  
  // Set a timeout to ensure we always respond
  const timeout = setTimeout(() => {
    if (!responseSent) {
      console.log('⏰ Timeout reached, sending fallback response')
      responseSent = true
      try {
        sendResponse({
          type: 'SUGGESTIONS_READY',
          success: false,
          suggestions: ['Request timed out. Please try again.'],
          error: 'Request timeout'
        })
      } catch (e) {
        console.error('Failed to send timeout response:', e)
      }
    }
  }, 10000) // 10 second timeout
  
  try {
    console.log('🔍 handleGetSuggestions called with:', msg)
    const { context, tone, provider } = msg
    console.log('📝 Extracted parameters:', { context, tone, provider })
    
    console.log('🚀 About to call getLLMSuggestions...')
    // Call the real LLM service
    const result = await getLLMSuggestions(context, tone, provider)
    console.log('✅ getLLMSuggestions completed:', result)
    
    if (!responseSent) {
      const response = {
        type: 'SUGGESTIONS_READY',
        success: result.success,
        suggestions: result.suggestions,
        error: result.error
      }
      console.log('📤 Sending response:', response)
      console.log('📤 Response type:', typeof response)
      console.log('📤 Response.suggestions:', response.suggestions)
      responseSent = true
      sendResponse(response)
      console.log('✅ sendResponse called successfully')
    }
  } catch (error) {
    console.error('❌ Error handling suggestions request:', error)
    console.error('❌ Error stack:', error.stack)
    
    if (!responseSent) {
      const errorResponse = {
        type: 'SUGGESTIONS_READY',
        success: false,
        suggestions: ['Error generating suggestions. Please try again.'],
        error: error.message
      }
      console.log('📤 Sending error response:', errorResponse)
      responseSent = true
      sendResponse(errorResponse)
      console.log('✅ Error sendResponse called successfully')
    }
  } finally {
    clearTimeout(timeout)
  }
}

// Inlined LLM Service Functions
async function getLLMSuggestions(context, tone, provider) {
  try {
    let apiKey // Will be undefined for 'local'

    // Only get API key if it's not a local provider
    if (provider !== 'local') {
      apiKey = await getKey(provider)
      if (!apiKey) {
        return { success: false, error: 'API key not found. Please configure your API key in the options page.' }
      }
    }

    const systemPrompt = `You are a reply suggestion assistant. Your task is to generate 3 short reply suggestions for the "user" to say in response to the last message from the "assistant".

Follow these strict rules:
1. LANGUAGE: Analyze the conversation. You MUST generate all suggestions in the *same language* as the last message in the context.
2. ROLE: You are generating replies for the "user". The history shows messages from "user" (your past messages) and "assistant" (the other person's messages).
3. TONE: Generate replies in a ${tone} tone.
4. DIVERSITY: Provide exactly 3 suggestions with different intents:
   - One (1) suggestion that AGREES with or is supportive of the last message.
   - One (1) suggestion that DISAGREES with or opposes the last message.
   - One (1) suggestion that is NEUTRAL or asks a clarifying question.
5. FORMAT: Separate each suggestion *only* with "---". Keep each suggestion concise (1-2 sentences).`

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
      case 'local':
        suggestions = await callLocalLLM(context, systemPrompt)
        break
      default:
        return { success: false, error: `Unsupported provider: ${provider}` }
    }

    if (suggestions.success) {
      // Parse suggestions by splitting on '---'
      const parsedSuggestions = suggestions.data
        .split('---')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 3) // Ensure max 3 suggestions

      return { success: true, suggestions: parsedSuggestions }
    } else {
      return { success: false, error: suggestions.error }
    }
  } catch (error) {
    console.error('LLM service error:', error)
    return { success: false, error: `Unexpected error: ${error.message}` }
  }
}

// Inlined Storage Functions
async function getKey(provider) {
  try {
    const result = await chrome.storage.local.get(`api_key_${provider}`)
    return result[`api_key_${provider}`] || null
  } catch (error) {
    console.error('Failed to get API key:', error)
    return null
  }
}

// Inlined LLM API Functions
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
        max_tokens: 500,
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
    return { success: false, error: `Network error: ${error.message}` }
  }
}

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
        max_tokens: 500,
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
    return { success: false, error: `Network error: ${error.message}` }
  }
}

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

async function callLocalLLM(context, systemPrompt) {
  try {
    // Convert context from {text, role} to {content, role} format expected by Ollama
    const formattedContext = context.map(msg => ({
      role: msg.role,
      content: msg.text || msg.content
    }))
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...formattedContext
    ]

    console.log('🌐 Making request to Ollama API...')
    console.log('📝 Request payload:', JSON.stringify({
        model: 'llama3:latest',
        messages: messages,
        max_tokens: 500,
        temperature: 0.9,
        stream: false
    }, null, 2))
    
    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No 'Authorization' header needed for local Ollama
      },
      mode: 'cors', // Explicitly set CORS mode
      body: JSON.stringify({
        model: 'llama3:latest', // Use llama3:latest instead of llama3:8b
        messages: messages,
        max_tokens: 500,
        temperature: 0.9,
        stream: false // Ensure streaming is off
      })
    })
    
    console.log('📡 Response status:', response.status)
    console.log('📡 Response ok:', response.ok)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      let errorMessage = `Local LLM API error (HTTP ${response.status})`
      
      if (response.status === 403) {
        errorMessage = 'Ollama blocked the request due to CORS. Try: OLLAMA_ORIGINS="*" ollama serve'
      } else if (response.status === 404) {
        errorMessage = 'Model not found. Try running: ollama pull llama3:latest'
      } else if (response.status === 400) {
        errorMessage = 'Model not found. Try running: ollama pull llama3:latest'
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
      
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    console.log('📦 Ollama response data:', JSON.stringify(data, null, 2))
    
    const content = data.choices?.[0]?.message?.content

    if (!content || content.trim().length === 0) {
      console.log('❌ No content found in response. Full response:', data)
      return { success: false, error: 'Model returned empty response. Try regenerating or use a different tone.' }
    }

    console.log('✅ Content extracted:', content)
    return { success: true, data: content }
  } catch (error) {
    // This catch block will trigger if the server isn't running at all
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      return { success: false, error: 'Connection refused. Is your local LLM server (Ollama) running at http://localhost:11434?' }
    }
    if (error.message.includes('CORS') || error.message.includes('cors')) {
      return { success: false, error: 'CORS error. Try: OLLAMA_ORIGINS="*" ollama serve' }
    }
    return { success: false, error: `Local LLM Network error: ${error.message}` }
  }
}

// Lifecycle management - automatically stop capture when tabs are closed or navigate
chrome.tabs.onRemoved.addListener((tabId) => {
  if (capturingTabs.has(tabId)) {
    stopCapture(tabId)
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Stop capture if the tab navigates to a new URL
  if (capturingTabs.has(tabId) && changeInfo.url) {
    stopCapture(tabId)
  }
})

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AI Consul Lite installed')
  } else if (details.reason === 'update') {
    console.log('AI Consul Lite updated')
  }
})
