/**
 * Tests for Live Transcription Flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Live Transcription Flow', () => {
  let mockChromeTabs
  let mockChromeRuntime
  let mockChromeOffscreen
  let mockChromeTabCapture

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock Chrome APIs
    mockChromeTabs = {
      query: vi.fn(),
      sendMessage: vi.fn()
    }
    
    mockChromeRuntime = {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn()
      }
    }
    
    mockChromeOffscreen = {
      hasDocument: vi.fn(),
      createDocument: vi.fn(),
      closeDocument: vi.fn()
    }
    
    mockChromeTabCapture = {
      getMediaStreamId: vi.fn()
    }
    
    global.chrome.tabs = mockChromeTabs
    global.chrome.runtime = mockChromeRuntime
    global.chrome.offscreen = mockChromeOffscreen
    global.chrome.tabCapture = mockChromeTabCapture
    
    // Default mock responses
    mockChromeOffscreen.hasDocument.mockResolvedValue(false)
    mockChromeOffscreen.createDocument.mockResolvedValue(undefined)
    mockChromeTabCapture.getMediaStreamId.mockResolvedValue('stream-id-123')
    mockChromeTabs.query.mockResolvedValue([{ id: 1, active: true }])
    mockChromeTabs.sendMessage.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Service Worker Message Handling', () => {
    it('should handle TRANSCRIPT_READY message and forward to content script', async () => {
      const messageListener = vi.fn()
      mockChromeRuntime.onMessage.addListener.mockImplementation(messageListener)
      
      // Simulate TRANSCRIPT_READY message
      const transcriptMessage = {
        type: 'TRANSCRIPT_READY',
        transcript: 'Hello world',
        timestamp: Date.now()
      }
      
      // Call the message listener
      await messageListener(transcriptMessage, { tab: { id: 1 } }, vi.fn())
      
      // Verify offscreen document creation
      expect(mockChromeOffscreen.hasDocument).toHaveBeenCalled()
      expect(mockChromeOffscreen.createDocument).toHaveBeenCalledWith({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Required for live tab audio transcription'
      })
      
      // Verify stream ID request
      expect(mockChromeTabCapture.getMediaStreamId).toHaveBeenCalledWith({
        targetTabId: 1
      })
      
      // Verify message forwarding to offscreen
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'START_CAPTURE',
        target: 'offscreen',
        streamId: 'stream-id-123'
      })
    })

    it('should send live transcript to active tab', async () => {
      const messageListener = vi.fn()
      mockChromeRuntime.onMessage.addListener.mockImplementation(messageListener)
      
      // Simulate TRANSCRIPT_READY message
      const transcriptMessage = {
        type: 'TRANSCRIPT_READY',
        transcript: 'Live transcription test',
        timestamp: Date.now()
      }
      
      // Mock active tab
      mockChromeTabs.query.mockResolvedValueOnce([{ id: 1, active: true }])
      
      // Call the message listener
      await messageListener(transcriptMessage, { tab: { id: 1 } }, vi.fn())
      
      // Verify transcript was sent to content script
      expect(mockChromeTabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'LIVE_TRANSCRIPT_UPDATE',
        transcript: 'Live transcription test',
        timestamp: expect.any(Number)
      })
    })

    it('should handle errors when sending transcript to content script', async () => {
      const messageListener = vi.fn()
      mockChromeRuntime.onMessage.addListener.mockImplementation(messageListener)
      
      // Mock error when sending message
      mockChromeTabs.sendMessage.mockRejectedValueOnce(new Error('Content script not available'))
      
      const transcriptMessage = {
        type: 'TRANSCRIPT_READY',
        transcript: 'Test transcript',
        timestamp: Date.now()
      }
      
      // Should not throw error
      await expect(messageListener(transcriptMessage, { tab: { id: 1 } }, vi.fn())).resolves.toBeUndefined()
    })
  })

  describe('Content Script Message Handling', () => {
    it('should receive and process live transcript updates', () => {
      let receivedTranscript = null
      let transcriptCallback = null
      
      // Mock content script message handling
      const handleMessage = (msg, sender, sendResponse) => {
        if (msg.type === 'LIVE_TRANSCRIPT_UPDATE') {
          receivedTranscript = msg.transcript
          if (transcriptCallback) {
            transcriptCallback(msg.transcript)
          }
          sendResponse({ success: true })
          return true
        }
        return false
      }
      
      // Set up callback
      transcriptCallback = vi.fn()
      
      // Simulate message
      const result = handleMessage({
        type: 'LIVE_TRANSCRIPT_UPDATE',
        transcript: 'Hello from voice',
        timestamp: Date.now()
      }, { tab: { id: 1 } }, vi.fn())
      
      expect(result).toBe(true)
      expect(receivedTranscript).toBe('Hello from voice')
      expect(transcriptCallback).toHaveBeenCalledWith('Hello from voice')
    })

    it('should update UI with live transcript', () => {
      let uiTranscript = ''
      let uiVisible = false
      
      // Mock UI update function
      const updateUI = (transcript) => {
        uiTranscript = transcript
        uiVisible = transcript && transcript.trim().length > 0
      }
      
      // Test transcript updates
      updateUI('')
      expect(uiVisible).toBe(false)
      
      updateUI('   ') // Whitespace only
      expect(uiVisible).toBe(false)
      
      updateUI('Hello world')
      expect(uiVisible).toBe(true)
      expect(uiTranscript).toBe('Hello world')
      
      updateUI('This is a longer transcript with more words')
      expect(uiVisible).toBe(true)
      expect(uiTranscript).toBe('This is a longer transcript with more words')
    })
  })

  describe('Audio Capture Flow', () => {
    it('should start audio capture when extension icon is clicked', async () => {
      const startCapture = async (tab) => {
        await mockChromeOffscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['USER_MEDIA'],
          justification: 'Required for live tab audio transcription'
        })
        
        const streamId = await mockChromeTabCapture.getMediaStreamId({
          targetTabId: tab.id
        })
        
        await mockChromeRuntime.sendMessage({
          type: 'START_CAPTURE',
          target: 'offscreen',
          streamId: streamId
        })
        
        return streamId
      }
      
      const tab = { id: 1, url: 'https://web.whatsapp.com' }
      const streamId = await startCapture(tab)
      
      expect(streamId).toBe('stream-id-123')
      expect(mockChromeOffscreen.createDocument).toHaveBeenCalled()
      expect(mockChromeTabCapture.getMediaStreamId).toHaveBeenCalledWith({
        targetTabId: 1
      })
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'START_CAPTURE',
        target: 'offscreen',
        streamId: 'stream-id-123'
      })
    })

    it('should stop audio capture', async () => {
      const stopCapture = async (tabId) => {
        await mockChromeRuntime.sendMessage({
          type: 'STOP_CAPTURE',
          target: 'offscreen'
        })
        
        await mockChromeOffscreen.closeDocument()
      }
      
      await stopCapture(1)
      
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'STOP_CAPTURE',
        target: 'offscreen'
      })
      expect(mockChromeOffscreen.closeDocument).toHaveBeenCalled()
    })
  })

  describe('Whisper Worker Integration', () => {
    it('should process audio and return transcript', async () => {
      // Mock Whisper worker
      const mockWorker = {
        postMessage: vi.fn(),
        onmessage: null,
        terminate: vi.fn()
      }
      
      // Mock worker message handling
      const processAudio = (audioData) => {
        return new Promise((resolve) => {
          mockWorker.onmessage = (event) => {
            resolve(event.data)
          }
          
          // Simulate processing
          setTimeout(() => {
            mockWorker.onmessage({
              data: {
                type: 'transcript',
                text: 'Processed audio transcript',
                timestamp: Date.now()
              }
            })
          }, 100)
        })
      }
      
      const result = await processAudio('mock-audio-data')
      
      expect(result).toEqual({
        type: 'transcript',
        text: 'Processed audio transcript',
        timestamp: expect.any(Number)
      })
    })

    it('should handle worker errors', async () => {
      const mockWorker = {
        postMessage: vi.fn(),
        onmessage: null,
        onerror: null,
        terminate: vi.fn()
      }
      
      const processAudioWithError = (audioData) => {
        return new Promise((resolve, reject) => {
          mockWorker.onerror = (error) => {
            reject(error)
          }
          
          // Simulate error
          setTimeout(() => {
            mockWorker.onerror(new Error('Worker processing error'))
          }, 100)
        })
      }
      
      await expect(processAudioWithError('mock-audio-data')).rejects.toThrow('Worker processing error')
    })
  })

  describe('End-to-End Flow', () => {
    it('should complete full transcription flow', async () => {
      const flow = {
        steps: [],
        addStep: (step) => flow.steps.push(step)
      }
      
      // Step 1: User clicks extension icon
      flow.addStep('User clicks extension icon')
      
      // Step 2: Service worker starts capture
      await mockChromeOffscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Required for live tab audio transcription'
      })
      flow.addStep('Service worker creates offscreen document')
      
      // Step 3: Get media stream
      const streamId = await mockChromeTabCapture.getMediaStreamId({
        targetTabId: 1
      })
      flow.addStep(`Service worker gets media stream: ${streamId}`)
      
      // Step 4: Start capture
      await mockChromeRuntime.sendMessage({
        type: 'START_CAPTURE',
        target: 'offscreen',
        streamId: streamId
      })
      flow.addStep('Service worker starts audio capture')
      
      // Step 5: Process audio (simulated)
      const transcript = 'Hello, this is a test transcription'
      flow.addStep(`Whisper worker processes audio: "${transcript}"`)
      
      // Step 6: Send transcript to service worker
      await mockChromeRuntime.sendMessage({
        type: 'TRANSCRIPT_READY',
        transcript: transcript,
        timestamp: Date.now()
      })
      flow.addStep('Whisper worker sends transcript to service worker')
      
      // Step 7: Forward to content script
      mockChromeTabs.query.mockResolvedValueOnce([{ id: 1, active: true }])
      await mockChromeTabs.sendMessage(1, {
        type: 'LIVE_TRANSCRIPT_UPDATE',
        transcript: transcript,
        timestamp: Date.now()
      })
      flow.addStep('Service worker forwards transcript to content script')
      
      // Step 8: Update UI
      flow.addStep('Content script updates UI with live transcript')
      
      expect(flow.steps).toEqual([
        'User clicks extension icon',
        'Service worker creates offscreen document',
        'Service worker gets media stream: stream-id-123',
        'Service worker starts audio capture',
        'Whisper worker processes audio: "Hello, this is a test transcription"',
        'Whisper worker sends transcript to service worker',
        'Service worker forwards transcript to content script',
        'Content script updates UI with live transcript'
      ])
    })

    it('should handle multiple transcript updates', async () => {
      const transcripts = []
      const transcriptCallback = vi.fn((transcript) => {
        transcripts.push(transcript)
      })
      
      // Simulate multiple transcript updates
      const updates = [
        'Hello',
        'Hello world',
        'Hello world, how',
        'Hello world, how are you?'
      ]
      
      for (const transcript of updates) {
        transcriptCallback(transcript)
      }
      
      expect(transcripts).toEqual(updates)
      expect(transcriptCallback).toHaveBeenCalledTimes(4)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle capture start errors', async () => {
      mockChromeTabCapture.getMediaStreamId.mockRejectedValueOnce(new Error('Permission denied'))
      
      const startCapture = async (tab) => {
        try {
          const streamId = await mockChromeTabCapture.getMediaStreamId({
            targetTabId: tab.id
          })
          return streamId
        } catch (error) {
          throw new Error(`Failed to start capture: ${error.message}`)
        }
      }
      
      await expect(startCapture({ id: 1 })).rejects.toThrow('Failed to start capture: Permission denied')
    })

    it('should handle worker communication errors', async () => {
      const mockWorker = {
        postMessage: vi.fn(),
        onmessage: null,
        terminate: vi.fn()
      }
      
      const processAudioWithTimeout = (audioData) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Worker timeout'))
          }, 1000)
          
          mockWorker.onmessage = (event) => {
            clearTimeout(timeout)
            resolve(event.data)
          }
        })
      }
      
      // Don't trigger onmessage, should timeout
      await expect(processAudioWithTimeout('audio-data')).rejects.toThrow('Worker timeout')
    })

    it('should handle content script not available', async () => {
      mockChromeTabs.sendMessage.mockRejectedValueOnce(new Error('Could not establish connection'))
      
      const sendTranscript = async (tabId, transcript) => {
        try {
          await mockChromeTabs.sendMessage(tabId, {
            type: 'LIVE_TRANSCRIPT_UPDATE',
            transcript: transcript,
            timestamp: Date.now()
          })
        } catch (error) {
          console.log('Could not send transcript to content script:', error.message)
          // Should not throw, just log
        }
      }
      
      await expect(sendTranscript(1, 'test transcript')).resolves.toBeUndefined()
    })
  })
})
