/**
 * Service Worker for AI Consul Lite
 * Orchestrates tab capture, message routing, and state management
 */

import { getLLMSuggestions } from '../lib/llm_service.js'
import { saveRecentTranscript } from '../lib/storage.js'

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
  
  if (msg.type === 'GET_SUGGESTIONS') {
    console.log('🔄 Processing GET_SUGGESTIONS request:', msg)
    // Handle LLM suggestion requests from content scripts
    handleGetSuggestions(msg, sendResponse)
    return true // Indicate async response
  }
  
  if (msg.type === 'PING') {
    console.log('🏓 Received PING, sending PONG')
    sendResponse({ type: 'PONG', message: 'Service worker is active' })
    return true
  }
  
  if (msg.type === 'CAPTURE_STARTED') {
    // Audio capture is now active
    chrome.action.setBadgeText({ text: 'ON' })
    chrome.action.setBadgeBackgroundColor({ color: '#4688F1' })
  }
  
  if (msg.type === 'MODEL_LOADING') {
    // Model is loading
    chrome.action.setBadgeText({ text: '...' })
    chrome.action.setBadgeBackgroundColor({ color: '#FA9B3D' })
  }
  
  if (msg.type === 'TRANSCRIPT_READY') {
    console.log('Transcription:', msg.transcript)
    // Save transcript for context merging
    saveRecentTranscript(msg.transcript)
  }
  
  if (msg.type === 'CAPTURE_ERROR') {
    console.error("Audio Capture Error:", msg.error)
    chrome.action.setBadgeText({ text: "ERR" })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    // Clean up state
    stopCapture()
  }
})

/**
 * Handle LLM suggestion requests
 */
async function handleGetSuggestions(msg, sendResponse) {
  try {
    console.log('🔍 handleGetSuggestions called with:', msg)
    const { context, tone, provider } = msg
    console.log('📝 Extracted parameters:', { context, tone, provider })
    
    const result = await getLLMSuggestions(context, tone, provider)
    console.log('✅ getLLMSuggestions result:', result)
    
    const response = {
      type: 'SUGGESTIONS_READY',
      success: result.success,
      suggestions: result.suggestions,
      error: result.error
    }
    console.log('📤 Sending response:', response)
    sendResponse(response)
  } catch (error) {
    console.error('❌ Error handling suggestions request:', error)
    const errorResponse = {
      type: 'SUGGESTIONS_READY',
      success: false,
      error: error.message
    }
    console.log('📤 Sending error response:', errorResponse)
    sendResponse(errorResponse)
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
