/**
 * Tests for Storage Functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getSettings,
  saveSettings,
  getApiKey,
  saveApiKey,
  saveRecentTranscript,
  getRecentTranscripts,
  clearAllData
} from '../src/lib/storage.js'

describe('Storage Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock Chrome storage responses
    global.chrome.storage.sync.get.mockImplementation((keys) => {
      const mockData = {
        extensionEnabled: true,
        voiceEnabled: true,
        defaultTone: 'professional',
        siteStates: {
          'web.whatsapp.com': true,
          'web.telegram.org': false
        }
      }
      
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockData[keys] })
      } else if (Array.isArray(keys)) {
        const result = {}
        keys.forEach(key => {
          result[key] = mockData[key]
        })
        return Promise.resolve(result)
      } else {
        return Promise.resolve(mockData)
      }
    })
    
    global.chrome.storage.local.get.mockImplementation((keys) => {
      const mockData = {
        openaiApiKey: 'sk-test-key',
        anthropicApiKey: 'ant-test-key',
        googleApiKey: 'google-test-key',
        recentTranscripts: [
          { text: 'Hello world', timestamp: Date.now() - 1000 },
          { text: 'How are you?', timestamp: Date.now() - 500 }
        ]
      }
      
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockData[keys] })
      } else if (Array.isArray(keys)) {
        const result = {}
        keys.forEach(key => {
          result[key] = mockData[key]
        })
        return Promise.resolve(result)
      } else {
        return Promise.resolve(mockData)
      }
    })
    
    global.chrome.storage.sync.set.mockResolvedValue(undefined)
    global.chrome.storage.local.set.mockResolvedValue(undefined)
    global.chrome.storage.sync.remove.mockResolvedValue(undefined)
    global.chrome.storage.local.remove.mockResolvedValue(undefined)
    global.chrome.storage.sync.clear.mockResolvedValue(undefined)
    global.chrome.storage.local.clear.mockResolvedValue(undefined)
  })

  describe('getSettings', () => {
    it('should retrieve all settings from sync storage', async () => {
      const settings = await getSettings()
      
      expect(global.chrome.storage.sync.get).toHaveBeenCalledWith([
        'extensionEnabled',
        'voiceEnabled',
        'defaultTone',
        'siteStates'
      ])
      
      expect(settings).toEqual({
        extensionEnabled: true,
        voiceEnabled: true,
        defaultTone: 'professional',
        siteStates: {
          'web.whatsapp.com': true,
          'web.telegram.org': false
        }
      })
    })

    it('should handle missing settings with defaults', async () => {
      global.chrome.storage.sync.get.mockResolvedValueOnce({})
      
      const settings = await getSettings()
      
      expect(settings).toEqual({
        extensionEnabled: true,
        voiceEnabled: true,
        defaultTone: 'professional',
        siteStates: {}
      })
    })
  })

  describe('saveSettings', () => {
    it('should save settings to sync storage', async () => {
      const newSettings = {
        extensionEnabled: false,
        voiceEnabled: true,
        defaultTone: 'casual'
      }
      
      await saveSettings(newSettings)
      
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(newSettings)
    })

    it('should handle partial settings updates', async () => {
      const partialSettings = {
        defaultTone: 'friendly'
      }
      
      await saveSettings(partialSettings)
      
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(partialSettings)
    })
  })

  describe('getApiKey', () => {
    it('should retrieve API key for OpenAI provider', async () => {
      const apiKey = await getApiKey('openai')
      
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith('openaiApiKey')
      expect(apiKey).toBe('sk-test-key')
    })

    it('should retrieve API key for Anthropic provider', async () => {
      const apiKey = await getApiKey('anthropic')
      
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith('anthropicApiKey')
      expect(apiKey).toBe('ant-test-key')
    })

    it('should retrieve API key for Google provider', async () => {
      const apiKey = await getApiKey('google')
      
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith('googleApiKey')
      expect(apiKey).toBe('google-test-key')
    })

    it('should return null for unsupported provider', async () => {
      const apiKey = await getApiKey('unsupported')
      
      expect(apiKey).toBeNull()
    })

    it('should return null when no key is stored', async () => {
      global.chrome.storage.local.get.mockResolvedValueOnce({})
      
      const apiKey = await getApiKey('openai')
      
      expect(apiKey).toBeNull()
    })
  })

  describe('saveApiKey', () => {
    it('should save API key for OpenAI provider', async () => {
      await saveApiKey('openai', 'sk-new-key')
      
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        openaiApiKey: 'sk-new-key'
      })
    })

    it('should save API key for Anthropic provider', async () => {
      await saveApiKey('anthropic', 'ant-new-key')
      
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        anthropicApiKey: 'ant-new-key'
      })
    })

    it('should save API key for Google provider', async () => {
      await saveApiKey('google', 'google-new-key')
      
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        googleApiKey: 'google-new-key'
      })
    })

    it('should not save for unsupported provider', async () => {
      await saveApiKey('unsupported', 'test-key')
      
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled()
    })
  })

  describe('saveRecentTranscript', () => {
    it('should save transcript with timestamp', async () => {
      const transcript = 'New transcript'
      
      await saveRecentTranscript(transcript)
      
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        recentTranscripts: expect.arrayContaining([
          expect.objectContaining({
            text: transcript,
            timestamp: expect.any(Number)
          })
        ])
      })
    })

    it('should limit transcripts to 50 entries', async () => {
      // Mock existing transcripts (50 entries)
      const existingTranscripts = Array.from({ length: 50 }, (_, i) => ({
        text: `Transcript ${i}`,
        timestamp: Date.now() - (50 - i) * 1000
      }))
      
      global.chrome.storage.local.get.mockResolvedValueOnce({
        recentTranscripts: existingTranscripts
      })
      
      await saveRecentTranscript('New transcript')
      
      const setCall = global.chrome.storage.local.set.mock.calls[0][0]
      expect(setCall.recentTranscripts).toHaveLength(50)
      expect(setCall.recentTranscripts[49].text).toBe('New transcript')
    })

    it('should handle empty existing transcripts', async () => {
      global.chrome.storage.local.get.mockResolvedValueOnce({})
      
      await saveRecentTranscript('First transcript')
      
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        recentTranscripts: [{
          text: 'First transcript',
          timestamp: expect.any(Number)
        }]
      })
    })
  })

  describe('getRecentTranscripts', () => {
    it('should retrieve recent transcripts', async () => {
      const transcripts = await getRecentTranscripts()
      
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith('recentTranscripts')
      expect(transcripts).toHaveLength(2)
      expect(transcripts[0].text).toBe('Hello world')
      expect(transcripts[1].text).toBe('How are you?')
    })

    it('should filter out old transcripts', async () => {
      const oldTranscripts = [
        { text: 'Old transcript', timestamp: Date.now() - 25 * 60 * 1000 }, // 25 minutes ago
        { text: 'Recent transcript', timestamp: Date.now() - 5 * 60 * 1000 }  // 5 minutes ago
      ]
      
      global.chrome.storage.local.get.mockResolvedValueOnce({
        recentTranscripts: oldTranscripts
      })
      
      const transcripts = await getRecentTranscripts()
      
      expect(transcripts).toHaveLength(1)
      expect(transcripts[0].text).toBe('Recent transcript')
    })

    it('should return empty array when no transcripts exist', async () => {
      global.chrome.storage.local.get.mockResolvedValueOnce({})
      
      const transcripts = await getRecentTranscripts()
      
      expect(transcripts).toEqual([])
    })

    it('should limit transcripts to 10 entries', async () => {
      const manyTranscripts = Array.from({ length: 15 }, (_, i) => ({
        text: `Transcript ${i}`,
        timestamp: Date.now() - (15 - i) * 1000
      }))
      
      global.chrome.storage.local.get.mockResolvedValueOnce({
        recentTranscripts: manyTranscripts
      })
      
      const transcripts = await getRecentTranscripts()
      
      expect(transcripts).toHaveLength(10)
      expect(transcripts[0].text).toBe('Transcript 5') // Last 10 entries
      expect(transcripts[9].text).toBe('Transcript 14')
    })
  })

  describe('clearAllData', () => {
    it('should clear all sync storage', async () => {
      await clearAllData()
      
      expect(global.chrome.storage.sync.clear).toHaveBeenCalled()
    })

    it('should clear all local storage', async () => {
      await clearAllData()
      
      expect(global.chrome.storage.local.clear).toHaveBeenCalled()
    })

    it('should handle storage errors gracefully', async () => {
      global.chrome.storage.sync.clear.mockRejectedValueOnce(new Error('Sync error'))
      global.chrome.storage.local.clear.mockRejectedValueOnce(new Error('Local error'))
      
      // Should not throw
      await expect(clearAllData()).resolves.toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle storage get errors', async () => {
      global.chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'))
      
      await expect(getSettings()).rejects.toThrow('Storage error')
    })

    it('should handle storage set errors', async () => {
      global.chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'))
      
      await expect(saveSettings({})).rejects.toThrow('Storage error')
    })

    it('should handle storage clear errors', async () => {
      global.chrome.storage.sync.clear.mockRejectedValueOnce(new Error('Storage error'))
      global.chrome.storage.local.clear.mockRejectedValueOnce(new Error('Storage error'))
      
      // clearAllData should handle errors gracefully
      await expect(clearAllData()).resolves.toBeUndefined()
    })
  })
})
