/**
 * Tests for LLM Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getLLMSuggestions, testApiKey } from '../src/lib/llm_service.js'

describe('LLM Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    
    // Mock Chrome storage
    global.chrome.storage.local.get.mockResolvedValue({
      api_key_openai: 'test-openai-key',
      api_key_anthropic: 'test-anthropic-key',
      api_key_google: 'test-google-key'
    })
  })

  describe('getLLMSuggestions', () => {
    it('should get suggestions from OpenAI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test suggestion 1\n---\nTest suggestion 2\n---\nTest suggestion 3'
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'openai'
      )

      expect(result.success).toBe(true)
      expect(result.suggestions).toHaveLength(3)
      expect(result.suggestions[0]).toBe('Test suggestion 1')
      expect(result.suggestions[1]).toBe('Test suggestion 2')
      expect(result.suggestions[2]).toBe('Test suggestion 3')
    })

    it('should get suggestions from Anthropic', async () => {
      const mockResponse = {
        content: [{
          text: 'Test suggestion 1\n---\nTest suggestion 2'
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'casual',
        'anthropic'
      )

      expect(result.success).toBe(true)
      expect(result.suggestions).toHaveLength(2)
      expect(result.suggestions[0]).toBe('Test suggestion 1')
      expect(result.suggestions[1]).toBe('Test suggestion 2')
    })

    it('should get suggestions from Google', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Test suggestion 1\n---\nTest suggestion 2'
            }]
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'friendly',
        'google'
      )

      expect(result.success).toBe(true)
      expect(result.suggestions).toHaveLength(2)
      expect(result.suggestions[0]).toBe('Test suggestion 1')
      expect(result.suggestions[1]).toBe('Test suggestion 2')
    })

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'openai'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid API key')
    })

    it('should handle missing API key', async () => {
      global.chrome.storage.local.get.mockResolvedValueOnce({})

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'openai'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('API key not found')
    })

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'openai'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should handle unsupported provider', async () => {
      global.chrome.storage.local.get.mockResolvedValueOnce({
        api_key_unsupported: 'test-key'
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'unsupported'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported provider')
    })

    it('should get suggestions from Local LLM', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test suggestion 1\n---\nTest suggestion 2\n---\nTest suggestion 3'
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'local'
      )

      expect(result.success).toBe(true)
      expect(result.suggestions).toHaveLength(3)
      expect(result.suggestions[0]).toBe('Test suggestion 1')
      expect(result.suggestions[1]).toBe('Test suggestion 2')
      expect(result.suggestions[2]).toBe('Test suggestion 3')
    })

    it('should handle Local LLM connection errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'local'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection refused')
    })

    it('should handle Local LLM server not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({})
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'local'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Model not found')
    })

    it('should handle Local LLM model not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({})
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'local'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Model not found')
    })

    it('should handle Local LLM CORS errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ error: { message: 'CORS error' } })
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'local'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('CORS')
    })
  })

  describe('testApiKey', () => {
    it('should test OpenAI API key successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test successful'
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await testApiKey('openai', 'test-key')

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      )
    })

    it('should test Anthropic API key successfully', async () => {
      const mockResponse = {
        content: [{
          text: 'Test successful'
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await testApiKey('anthropic', 'test-key')

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key'
          })
        })
      )
    })

    it('should test Google API key successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Test successful'
            }]
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await testApiKey('google', 'test-key')

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=test-key',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    it('should return false for invalid API key', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      const result = await testApiKey('openai', 'invalid-key')

      expect(result.success).toBe(false)
    })

    it('should return false for unsupported provider', async () => {
      const result = await testApiKey('unsupported', 'test-key')

      expect(result.success).toBe(false)
    })

    it('should test Local LLM connection successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test successful'
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await testApiKey('local', null)

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle Local LLM connection failure during testing', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const result = await testApiKey('local', null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection refused')
    })

    it('should handle network errors during testing', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await testApiKey('openai', 'test-key')

      expect(result.success).toBe(false)
    })
  })

  describe('Response Parsing', () => {
    it('should parse OpenAI response with multiple suggestions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Suggestion 1\n---\nSuggestion 2\n---\nSuggestion 3'
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'openai'
      )

      expect(result.success).toBe(true)
      expect(result.suggestions).toHaveLength(3)
      expect(result.suggestions[0]).toBe('Suggestion 1')
      expect(result.suggestions[1]).toBe('Suggestion 2')
      expect(result.suggestions[2]).toBe('Suggestion 3')
    })

    it('should parse Anthropic response with multiple suggestions', async () => {
      const mockResponse = {
        content: [{
          text: 'Suggestion 1\n---\nSuggestion 2'
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'anthropic'
      )

      expect(result.success).toBe(true)
      expect(result.suggestions).toHaveLength(2)
      expect(result.suggestions[0]).toBe('Suggestion 1')
      expect(result.suggestions[1]).toBe('Suggestion 2')
    })

    it('should parse Google response with multiple suggestions', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Suggestion 1\n---\nSuggestion 2'
            }]
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'google'
      )

      expect(result.success).toBe(true)
      expect(result.suggestions).toHaveLength(2)
      expect(result.suggestions[0]).toBe('Suggestion 1')
      expect(result.suggestions[1]).toBe('Suggestion 2')
    })

    it('should handle empty response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: ''
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLLMSuggestions(
        [{ role: 'user', content: 'Hello' }],
        'professional',
        'openai'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('No response content')
    })
  })
})