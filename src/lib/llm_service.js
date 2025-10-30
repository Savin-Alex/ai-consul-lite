/**
 * LLM Service for AI Consul Lite
 * Handles direct API calls to OpenAI, Anthropic, and Google Gemini
 * Includes streaming support for all providers
 */

import { getKey, saveKey } from './storage.js'
import { streamOpenAI, streamAnthropic, streamGoogle, streamLocalLLM } from './streaming.js'

/**
 * Get AI reply suggestions from the specified LLM provider
 * @param {Array} context - Array of message objects with role and content
 * @param {string} tone - Tone for the response (formal, semi-formal, friendly, slang)
 * @param {string} provider - LLM provider (openai, anthropic, google, local)
 * @returns {Promise<{success: boolean, suggestions?: Array<string>, error?: string}>}
 */
export async function getLLMSuggestions(context, tone, provider) {
  try {
    let apiKey // Will be undefined for 'local'

    // Only get API key if it's not a local provider
    if (provider !== 'local') {
      apiKey = await getKey(provider)
      if (!apiKey) {
        return { success: false, error: 'API key not found. Please configure your API key in the options page.' }
      }
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
    return { success: false, error: `Network error: ${error.message}` }
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
    return { success: false, error: `Network error: ${error.message}` }
  }
}

/**
 * Call Google Gemini API - FIXED VERSION
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
 * Call Local LLM (Ollama) API
 * @param {Array} context - Array of message objects with role and content
 * @param {string} systemPrompt - System prompt for the LLM
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
async function callLocalLLM(context, systemPrompt) {
  try {
    // Resolve model preference: session override -> default -> fallback
    let modelName = 'llama3:latest'
    try {
      const { defaultLocalModel } = await chrome.storage.sync.get(['defaultLocalModel'])
      const localStore = await chrome.storage.local.get(['sessionLocalModel'])
      modelName = localStore.sessionLocalModel || defaultLocalModel || modelName
    } catch (e) {
      // Ignore storage errors and keep fallback model
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context
    ]

    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No 'Authorization' header needed for local Ollama
      },
      mode: 'cors', // Explicitly set CORS mode
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        max_tokens: 300,
        temperature: 0.7,
        stream: false // Ensure streaming is off
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      let errorMessage = `Local LLM API error (HTTP ${response.status})`
      
      if (response.status === 403) {
        errorMessage = 'Ollama blocked the request due to CORS. Try: OLLAMA_ORIGINS="*" ollama serve'
      } else if (response.status === 404) {
        errorMessage = `Model not found. Check the model name: ${modelName}`
      } else if (response.status === 400) {
        errorMessage = `Model not found. Check the model name: ${modelName}`
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
      
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return { success: false, error: 'No response content received from Local LLM' }
    }

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

/**
 * Test API key validity - IMPROVED VERSION
 * @param {string} provider - Provider to test
 * @param {string} apiKey - API key to test
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function testApiKey(provider, apiKeyToTest) {
  const testContext = [{ role: 'user', content: 'Hello, this is a test message.' }]
  const systemPrompt = 'Respond concisely.'
  
  try {
    let result
    // Call the specific function directly with the key without modifying storage
    switch (provider.toLowerCase()) {
      case 'openai':
        result = await callOpenAI(testContext, systemPrompt, apiKeyToTest)
        break
      case 'anthropic':
        result = await callAnthropic(testContext, systemPrompt, apiKeyToTest)
        break
      case 'google':
        result = await callGoogle(testContext, systemPrompt, apiKeyToTest)
        break
      case 'local':
        result = await callLocalLLM(testContext, systemPrompt)
        break
      default:
        return { success: false, error: `Unsupported provider: ${provider}` }
    }
    
    // Return based on whether the API call itself succeeded
    return { success: result.success, error: result.error }
  } catch (error) {
    return { success: false, error: `Test failed: ${error.message}` }
  }
}

/**
 * Stream AI reply suggestions from the specified LLM provider
 * @param {Array} context - Array of message objects with role and content
 * @param {string} tone - Tone for the response (formal, semi-formal, friendly, slang)
 * @param {string} provider - LLM provider (openai, anthropic, google, local)
 * @param {Function} onChunk - Callback function that receives incremental text chunks
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function streamLLMSuggestions(context, tone, provider, onChunk) {
  try {
    let apiKey // Will be undefined for 'local'

    // Only get API key if it's not a local provider
    if (provider !== 'local') {
      apiKey = await getKey(provider)
      if (!apiKey) {
        return { success: false, error: 'API key not found. Please configure your API key in the options page.' }
      }
    }

    // Use the same enhanced system prompt as non-streaming version
    const systemPrompt = `You are a helpful assistant that generates reply suggestions for chat conversations. 

IMPORTANT: The last message in the conversation is what you need to reply to. Generate REPLY suggestions, NOT continuations.

CRITICAL RULES:
1. ALWAYS respond in the EXACT SAME language as the last message
2. Generate exactly 3 diverse REPLY suggestions (not continuations of your own message)
3. Each suggestion must be 1-2 sentences long
4. Separate each suggestion with exactly "---" (three dashes)
5. Provide one suggestion that agrees/confirms with the last message
6. Provide one suggestion that disagrees or offers an alternative perspective
7. Provide one suggestion that is neutral, asks a question, or seeks clarification
8. Use a ${tone} tone
9. DO NOT include the word "suggestion" or any explanation in your response
10. ONLY output the 3 suggestions separated by "---"

Example:
If last message is: "Спасибо" (Thank you)
Good replies: "Не за что" / "Пожалуйста" / "Рад был помочь"
Bad: "за понимание" (this is a continuation, not a reply)

Format: [first suggestion]---[second suggestion]---[third suggestion]`

    // Format context to match streaming API expectations
    const formattedContext = context.map(msg => ({
      role: msg.role,
      content: msg.text || msg.content
    }))

    let result
    switch (provider.toLowerCase()) {
      case 'openai':
        result = await streamOpenAI(formattedContext, systemPrompt, apiKey, onChunk)
        break
      case 'anthropic':
        result = await streamAnthropic(formattedContext, systemPrompt, apiKey, onChunk)
        break
      case 'google':
        result = await streamGoogle(formattedContext, systemPrompt, apiKey, onChunk)
        break
      case 'local':
        // Resolve model name for local provider
        let modelName = 'llama3:latest'
        try {
          const { defaultLocalModel } = await chrome.storage.sync.get(['defaultLocalModel'])
          const localStore = await chrome.storage.local.get(['sessionLocalModel'])
          modelName = localStore.sessionLocalModel || defaultLocalModel || modelName
        } catch (e) {
          // Ignore storage errors and keep fallback model
        }
        result = await streamLocalLLM(formattedContext, systemPrompt, modelName, onChunk)
        break
      default:
        return { success: false, error: `Unsupported provider: ${provider}` }
    }

    return result
  } catch (error) {
    console.error('LLM streaming error:', error)
    return { success: false, error: `Unexpected error: ${error.message}` }
  }
}

