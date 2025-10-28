/**
 * Streaming Protocol for AI Consul Lite
 * Handles streaming LLM responses via port-based communication
 */

/**
 * Streaming call to OpenAI API
 * @param {Array} context - Message context
 * @param {string} systemPrompt - System prompt
 * @param {string} apiKey - API key
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function streamOpenAI(context, systemPrompt, apiKey, onChunk) {
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
        temperature: 0.7,
        stream: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: `OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}` }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          
          try {
            const json = JSON.parse(data)
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              onChunk(content)
            }
          } catch (e) {
            console.error('Error parsing OpenAI stream:', e)
          }
        }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: `OpenAI streaming error: ${error.message}` }
  }
}

/**
 * Streaming call to Anthropic API
 */
export async function streamAnthropic(context, systemPrompt, apiKey, onChunk) {
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
        messages: messages,
        stream: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: `Anthropic API error (${response.status}): ${errorData.error?.message || response.statusText}` }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          
          try {
            const json = JSON.parse(data)
            if (json.type === 'content_block_delta' && json.delta?.text) {
              onChunk(json.delta.text)
            }
          } catch (e) {
            console.error('Error parsing Anthropic stream:', e)
          }
        }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: `Anthropic streaming error: ${error.message}` }
  }
}

/**
 * Streaming call to Google Gemini API
 */
export async function streamGoogle(context, systemPrompt, apiKey, onChunk) {
  try {
    const contents = []
    
    if (systemPrompt) {
      contents.push({ role: "user", parts: [{ text: systemPrompt }] })
      contents.push({ role: "model", parts: [{ text: "Okay, I understand the instructions." }] })
    }

    context.forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })
    })

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: `Google API error (${response.status}): ${errorData.error?.message || response.statusText}` }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      // Gemini returns chunks in a specific format
      const parts = buffer.split('\n')
      buffer = parts.pop()

      for (const part of parts) {
        if (!part.trim()) continue
        
        try {
          const json = JSON.parse(part)
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            onChunk(text)
          }
        } catch (e) {
          // Not a JSON line, skip
        }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: `Google streaming error: ${error.message}` }
  }
}

/**
 * Streaming call to Local LLM (Ollama) API
 */
export async function streamLocalLLM(context, systemPrompt, modelName, onChunk) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context
    ]

    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify({
        model: modelName || 'llama3:latest',
        messages: messages,
        max_tokens: 500,
        temperature: 0.9,
        stream: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      let errorMessage = `Local LLM API error (HTTP ${response.status})`
      
      if (response.status === 403) {
        errorMessage = 'Ollama blocked the request due to CORS. Try: OLLAMA_ORIGINS="*" ollama serve'
      } else if (response.status === 404 || response.status === 400) {
        errorMessage = `Model not found. Check the model name: ${modelName}`
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
      
      return { success: false, error: errorMessage }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.trim()) continue
        
        try {
          const json = JSON.parse(line)
          const content = json.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
        } catch (e) {
          // Not a JSON line, skip
        }
      }
    }

    return { success: true }
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      return { success: false, error: 'Connection refused. Is your local LLM server (Ollama) running at http://localhost:11434?' }
    }
    return { success: false, error: `Local LLM Network error: ${error.message}` }
  }
}

