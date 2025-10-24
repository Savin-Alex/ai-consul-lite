/**
 * Tests for LLM Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { callOpenAI, callAnthropic, callGoogle, testApiKey } from '../src/lib/llm_service.js'

describe('LLM Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('callOpenAI', () => {
    it('should make correct API call to OpenAI', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response from OpenAI'
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await callOpenAI('test-key', [
        { role: 'user', content: 'Hello' }
      ])

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"model":"gpt-4o"')
        })
      )

      expect(result).toBe('Test response from OpenAI')
    })

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(callOpenAI('invalid-key', [
        { role: 'user', content: 'Hello' }
      ])).rejects.toThrow('OpenAI API error: 401 Unauthorized')
    })

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(callOpenAI('test-key', [
        { role: 'user', content: 'Hello' }
      ])).rejects.toThrow('Network error')
    })
  })

  describe('callAnthropic', () => {
    it('should make correct API call to Anthropic', async () => {
      const mockResponse = {
        content: [{
          text: 'Test response from Anthropic'
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await callAnthropic('test-key', [
        { role: 'user', content: 'Hello' }
      ])

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"model":"claude-3-5-sonnet-20241022"')
        })
      )

      expect(result).toBe('Test response from Anthropic')
    })

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      })

      await expect(callAnthropic('invalid-key', [
        { role: 'user', content: 'Hello' }
      ])).rejects.toThrow('Anthropic API error: 403 Forbidden')
    })
  })

  describe('callGoogle', () => {
    it('should make correct API call to Google Gemini', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Test response from Google'
            }]
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await callGoogle('test-key', [
        { role: 'user', content: 'Hello' }
      ])

      expect(global.fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"model":"gemini-1.5-flash"')
        })
      )

      expect(result).toBe('Test response from Google')
    })

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(callGoogle('invalid-key', [
        { role: 'user', content: 'Hello' }
      ])).rejects.toThrow('Google API error: 400 Bad Request')
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

      expect(result).toBe(true)
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

      expect(result).toBe(true)
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

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
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

      expect(result).toBe(false)
    })

    it('should return false for unsupported provider', async () => {
      const result = await testApiKey('unsupported', 'test-key')

      expect(result).toBe(false)
    })

    it('should handle network errors during testing', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await testApiKey('openai', 'test-key')

      expect(result).toBe(false)
    })
  })

  describe('API Response Parsing', () => {
    it('should handle OpenAI response with multiple choices', async () => {
      const mockResponse = {
        choices: [
          { message: { content: 'First choice' } },
          { message: { content: 'Second choice' } }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await callOpenAI('test-key', [
        { role: 'user', content: 'Hello' }
      ])

      expect(result).toBe('First choice')
    })

    it('should handle Anthropic response with multiple content blocks', async () => {
      const mockResponse = {
        content: [
          { text: 'First part' },
          { text: 'Second part' }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await callAnthropic('test-key', [
        { role: 'user', content: 'Hello' }
      ])

      expect(result).toBe('First partSecond part')
    })

    it('should handle Google response with multiple parts', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [
              { text: 'First part' },
              { text: 'Second part' }
            ]
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await callGoogle('test-key', [
        { role: 'user', content: 'Hello' }
      ])

      expect(result).toBe('First partSecond part')
    })
  })
})
