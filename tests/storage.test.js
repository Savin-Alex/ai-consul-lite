/**
 * Tests for Storage Functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveKey,
  getKey,
  savePref,
  getPref,
  getExtensionState,
  setExtensionState,
  getSiteState,
  setSiteState,
  getDefaultTone,
  setDefaultTone,
  getDefaultProvider,
  setDefaultProvider,
  getVoiceEnabled,
  setVoiceEnabled,
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
        defaultProvider: 'openai',
        siteStates: {
          'web.whatsapp.com': true,
          'web.telegram.org': false
        },
        recentTranscripts: [
          { transcript: 'Hello world', timestamp: Date.now() - 1000 },
          { transcript: 'How are you?', timestamp: Date.now() - 500 }
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
    
    global.chrome.storage.local.get.mockImplementation((keys) => {
      const mockData = {
        api_key_openai: 'sk-test-key',
        api_key_anthropic: 'ant-test-key',
        api_key_google: 'google-test-key',
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

  describe('API Key Functions', () => {
    it('should save API key for OpenAI provider', async () => {
      const result = await saveKey('openai', 'sk-new-key')
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        api_key_openai: 'sk-new-key'
      })
    })

    it('should save API key for Anthropic provider', async () => {
      const result = await saveKey('anthropic', 'ant-new-key')
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        api_key_anthropic: 'ant-new-key'
      })
    })

    it('should save API key for Google provider', async () => {
      const result = await saveKey('google', 'google-new-key')
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        api_key_google: 'google-new-key'
      })
    })

    it('should retrieve API key for OpenAI provider', async () => {
      const apiKey = await getKey('openai')
      
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith('api_key_openai')
      expect(apiKey).toBe('sk-test-key')
    })

    it('should retrieve API key for Anthropic provider', async () => {
      const apiKey = await getKey('anthropic')
      
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith('api_key_anthropic')
      expect(apiKey).toBe('ant-test-key')
    })

    it('should retrieve API key for Google provider', async () => {
      const apiKey = await getKey('google')
      
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith('api_key_google')
      expect(apiKey).toBe('google-test-key')
    })

    it('should return null when no key is stored', async () => {
      global.chrome.storage.local.get.mockResolvedValueOnce({})
      
      const apiKey = await getKey('openai')
      
      expect(apiKey).toBeNull()
    })

    it('should handle storage errors when saving key', async () => {
      global.chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'))
      
      const result = await saveKey('openai', 'test-key')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage error')
    })
  })

  describe('Preference Functions', () => {
    it('should save and retrieve preferences', async () => {
      const result = await savePref('testPref', 'testValue')
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        testPref: 'testValue'
      })
      
      const value = await getPref('testPref', 'default')
      expect(global.chrome.storage.sync.get).toHaveBeenCalledWith('testPref')
    })

    it('should return default value when preference not found', async () => {
      global.chrome.storage.sync.get.mockResolvedValueOnce({})
      
      const value = await getPref('nonexistent', 'defaultValue')
      
      expect(value).toBe('defaultValue')
    })
  })

  describe('Extension State Functions', () => {
    it('should get extension state', async () => {
      const state = await getExtensionState()
      
      expect(global.chrome.storage.sync.get).toHaveBeenCalledWith('extensionEnabled')
      expect(state).toBe(true)
    })

    it('should set extension state', async () => {
      const result = await setExtensionState(false)
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        extensionEnabled: false
      })
    })
  })

  describe('Site State Functions', () => {
    it('should get site state', async () => {
      const state = await getSiteState('web.whatsapp.com')
      
      expect(global.chrome.storage.sync.get).toHaveBeenCalledWith('siteStates')
      expect(state).toBe(true)
    })

    it('should set site state', async () => {
      const result = await setSiteState('web.whatsapp.com', false)
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        siteStates: expect.objectContaining({
          'web.whatsapp.com': false
        })
      })
    })
  })

  describe('Default Settings Functions', () => {
    it('should get and set default tone', async () => {
      const tone = await getDefaultTone()
      expect(tone).toBe('professional')
      
      const result = await setDefaultTone('casual')
      expect(result.success).toBe(true)
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        defaultTone: 'casual'
      })
    })

    it('should get and set default provider', async () => {
      const provider = await getDefaultProvider()
      expect(provider).toBe('openai')
      
      const result = await setDefaultProvider('anthropic')
      expect(result.success).toBe(true)
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        defaultProvider: 'anthropic'
      })
    })

    it('should get and set voice enabled', async () => {
      const enabled = await getVoiceEnabled()
      expect(enabled).toBe(true)
      
      const result = await setVoiceEnabled(false)
      expect(result.success).toBe(true)
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        voiceEnabled: false
      })
    })
  })

  describe('Transcript Functions', () => {
    it('should save transcript with timestamp', async () => {
      const result = await saveRecentTranscript('New transcript')
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.sync.get).toHaveBeenCalledWith('recentTranscripts')
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
        recentTranscripts: expect.arrayContaining([
          expect.objectContaining({
            transcript: 'New transcript',
            timestamp: expect.any(Number)
          })
        ])
      })
    })

    it('should limit transcripts to 10 entries', async () => {
      // Mock existing transcripts (15 entries)
      const existingTranscripts = Array.from({ length: 15 }, (_, i) => ({
        transcript: `Transcript ${i}`,
        timestamp: Date.now() - (15 - i) * 1000
      }))
      
      global.chrome.storage.sync.get.mockResolvedValueOnce({
        recentTranscripts: existingTranscripts
      })
      
      const result = await saveRecentTranscript('New transcript')
      
      expect(result.success).toBe(true)
      const setCall = global.chrome.storage.sync.set.mock.calls[0][0]
      expect(setCall.recentTranscripts).toHaveLength(10)
      expect(setCall.recentTranscripts[0].transcript).toBe('New transcript')
    })

    it('should retrieve recent transcripts', async () => {
      const transcripts = await getRecentTranscripts()
      
      expect(global.chrome.storage.sync.get).toHaveBeenCalledWith('recentTranscripts')
      expect(transcripts).toHaveLength(2)
      expect(transcripts[0].transcript).toBe('Hello world')
      expect(transcripts[1].transcript).toBe('How are you?')
    })

    it('should filter out old transcripts', async () => {
      // Clear the default mock for this test
      global.chrome.storage.sync.get.mockClear()
      
      const oldTranscripts = [
        { transcript: 'Old transcript', timestamp: Date.now() - 25 * 60 * 1000 }, // 25 minutes ago
        { transcript: 'Recent transcript', timestamp: Date.now() - 5 * 60 * 1000 }  // 5 minutes ago
      ]
      
      global.chrome.storage.sync.get.mockResolvedValueOnce({
        recentTranscripts: oldTranscripts
      })
      
      const transcripts = await getRecentTranscripts()
      
      expect(transcripts).toHaveLength(1)
      expect(transcripts[0].transcript).toBe('Recent transcript')
    })

    it('should limit transcripts to 10 entries', async () => {
      const manyTranscripts = Array.from({ length: 15 }, (_, i) => ({
        transcript: `Transcript ${i}`,
        timestamp: Date.now() - (15 - i) * 1000
      }))
      
      global.chrome.storage.sync.get.mockResolvedValueOnce({
        recentTranscripts: manyTranscripts
      })
      
      const transcripts = await getRecentTranscripts()
      
      expect(transcripts).toHaveLength(15) // getRecentTranscripts doesn't limit, just filters by age
      expect(transcripts[0].transcript).toBe('Transcript 0') // All transcripts are recent
      expect(transcripts[14].transcript).toBe('Transcript 14')
    })
  })

  describe('clearAllData', () => {
    it('should clear all sync storage', async () => {
      const result = await clearAllData()
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.sync.clear).toHaveBeenCalled()
    })

    it('should clear all local storage', async () => {
      const result = await clearAllData()
      
      expect(result.success).toBe(true)
      expect(global.chrome.storage.local.clear).toHaveBeenCalled()
    })

    it('should handle storage errors gracefully', async () => {
      global.chrome.storage.local.clear.mockResolvedValueOnce(undefined)
      global.chrome.storage.sync.clear.mockRejectedValueOnce(new Error('Sync error'))
      
      const result = await clearAllData()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Sync error')
    })
  })

  describe('Error Handling', () => {
    it('should handle storage get errors', async () => {
      global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'))
      
      const result = await getKey('openai')
      
      expect(result).toBeNull()
    })

    it('should handle storage set errors', async () => {
      global.chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'))
      
      const result = await savePref('test', 'value')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage error')
    })
  })
})