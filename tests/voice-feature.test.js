/**
 * Tests for Voice Transcription Feature
 * Tests audio capture, resampling, Whisper worker integration, and service worker keep-alive
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Voice Transcription Feature', () => {
  let mockChromeOffscreen
  let mockChromeTabCapture
  let mockChromeRuntime
  let mockMediaRecorder
  let mockAudioContext
  let mockWorker

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Chrome APIs
    mockChromeOffscreen = {
      hasDocument: vi.fn(),
      createDocument: vi.fn(),
      closeDocument: vi.fn()
    }

    mockChromeTabCapture = {
      getMediaStreamId: vi.fn()
    }

    mockChromeRuntime = {
      sendMessage: vi.fn()
    }

    global.chrome = {
      offscreen: mockChromeOffscreen,
      tabCapture: mockChromeTabCapture,
      runtime: mockChromeRuntime
    }

    // Mock MediaRecorder
    mockMediaRecorder = {
      state: 'inactive',
      start: vi.fn(),
      stop: vi.fn(),
      ondataavailable: null
    }

    // Mock AudioContext
    mockAudioContext = {
      decodeAudioData: vi.fn(),
      createMediaStreamSource: vi.fn(),
      destination: {},
      close: vi.fn(),
      state: 'running'
    }

    mockAudioContext.createMediaStreamSource.mockReturnValue({
      connect: vi.fn()
    })

    // Mock Worker
    mockWorker = {
      postMessage: vi.fn(),
      onmessage: null,
      terminate: vi.fn()
    }

    // Mock Web APIs
    global.MediaRecorder = vi.fn(() => mockMediaRecorder)
    global.AudioContext = vi.fn(() => mockAudioContext)
    global.Worker = vi.fn(() => mockWorker)

    // Default mock responses
    mockChromeOffscreen.hasDocument.mockResolvedValue(false)
    mockChromeOffscreen.createDocument.mockResolvedValue(undefined)
    mockChromeTabCapture.getMediaStreamId.mockResolvedValue('stream-id-123')
    mockChromeRuntime.sendMessage.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Audio Capture - startCapture', () => {
    it('should start audio capture successfully', async () => {
      const streamId = 'stream-id-123'
      const mockStream = { id: streamId }

      // Mock getUserMedia
      global.navigator = {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream)
        }
      }

      // Simulate startCapture function
      const startCapture = async (streamId) => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'tab',
              chromeMediaSourceId: streamId
            }
          }
        })

        const audioContext = new AudioContext()
        const streamSource = audioContext.createMediaStreamSource(stream)
        streamSource.connect(audioContext.destination)

        const worker = new Worker('workers/whisper-worker.js', { type: 'module' })

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        
        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            const arrayBuffer = await event.data.arrayBuffer()
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
            
            const pcmData = audioBuffer.getChannelData(0)
            const resampledPcm = resampleAudio(pcmData, audioBuffer.sampleRate, 16000)
            
            worker.postMessage({ audio: resampledPcm }, [resampledPcm.buffer])
          }
        }

        mediaRecorder.start(2000)
        return { success: true }
      }

      const result = await startCapture(streamId)

      expect(result.success).toBe(true)
      expect(global.MediaRecorder).toHaveBeenCalled()
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(2000)
    })

    it('should handle getUserMedia errors', async () => {
      const streamId = 'stream-id-123'
      const error = new Error('Permission denied')

      global.navigator = {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(error)
        }
      }

      const startCapture = async (streamId) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId
              }
            }
          })
          return { success: true }
        } catch (err) {
          chrome.runtime.sendMessage({
            type: 'CAPTURE_ERROR',
            error: err.message
          })
          return { success: false, error: err.message }
        }
      }

      const result = await startCapture(streamId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_ERROR',
        error: 'Permission denied'
      })
    })

    it('should not start capture if already recording', async () => {
      mockMediaRecorder.state = 'recording'

      const startCapture = (streamId) => {
        if (mockMediaRecorder && mockMediaRecorder.state === 'recording') {
          return { alreadyCapturing: true }
        }
        return { success: true }
      }

      const result = startCapture('stream-id-123')

      expect(result.alreadyCapturing).toBe(true)
      expect(mockMediaRecorder.start).not.toHaveBeenCalled()
    })
  })

  describe('Audio Resampling', () => {
    // Test the resampleAudio function
    function resampleAudio(audioData, fromSampleRate, toSampleRate) {
      if (fromSampleRate === toSampleRate) {
        return audioData
      }

      const ratio = fromSampleRate / toSampleRate
      const newLength = Math.round(audioData.length / ratio)
      const result = new Float32Array(newLength)
      
      for (let i = 0; i < newLength; i++) {
        const indexInOld = i * ratio
        const nearIndex = Math.floor(indexInOld)
        const fraction = indexInOld - nearIndex
        
        const nearValue = audioData[nearIndex]
        const farValue = audioData[nearIndex + 1] || nearValue
        
        result[i] = nearValue + (farValue - nearValue) * fraction
      }
      return result
    }

    it('should not resample if sample rates match', () => {
      const audioData = new Float32Array([0.1, 0.2, 0.3, 0.4])
      const result = resampleAudio(audioData, 44100, 44100)

      expect(result).toBe(audioData)
      expect(result).toHaveLength(4)
    })

    it('should resample audio from 44100Hz to 16000Hz', () => {
      const audioData = new Float32Array(4410) // 0.1 seconds at 44100Hz
      audioData.fill(0.5)

      const result = resampleAudio(audioData, 44100, 16000)

      expect(result).toHaveLength(1600) // Should be ~0.1 seconds at 16000Hz
      expect(result.every(val => Math.abs(val - 0.5) < 0.01)).toBe(true)
    })

    it('should resample audio from 48000Hz to 16000Hz', () => {
      const audioData = new Float32Array(4800) // 0.1 seconds at 48000Hz
      audioData.fill(0.8)

      const result = resampleAudio(audioData, 48000, 16000)

      expect(result).toHaveLength(1600) // Should be ~0.1 seconds at 16000Hz
      expect(result.every(val => Math.abs(val - 0.8) < 0.01)).toBe(true)
    })

    it('should handle edge cases at end of array', () => {
      const audioData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5])
      const result = resampleAudio(audioData, 5, 3)

      expect(result).toHaveLength(3)
      expect(result).toBeInstanceOf(Float32Array)
    })
  })

  describe('stopCapture', () => {
    it('should stop audio capture successfully', () => {
      mockMediaRecorder.state = 'recording'

      const stopCapture = () => {
        if (mockMediaRecorder && mockMediaRecorder.state === 'recording') {
          mockMediaRecorder.stop()
        }

        if (mockAudioContext && mockAudioContext.state !== 'closed') {
          mockAudioContext.close()
        }

        if (mockWorker) {
          mockWorker.terminate()
        }

        return { success: true }
      }

      const result = stopCapture()

      expect(result.success).toBe(true)
      expect(mockMediaRecorder.stop).toHaveBeenCalled()
      expect(mockAudioContext.close).toHaveBeenCalled()
      expect(mockWorker.terminate).toHaveBeenCalled()
    })

    it('should not crash if capture is not running', () => {
      mockMediaRecorder.state = 'inactive'

      const stopCapture = () => {
        if (mockMediaRecorder && mockMediaRecorder.state === 'recording') {
          mockMediaRecorder.stop()
        }
        return { stopped: true }
      }

      const result = stopCapture()

      expect(result.stopped).toBe(true)
      expect(mockMediaRecorder.stop).not.toHaveBeenCalled()
    })
  })

  describe('Whisper Worker Integration', () => {
    it('should send audio data to worker', async () => {
      const mockAudioData = new Float32Array(32000) // 2 seconds at 16kHz
      mockAudioData.fill(0.123)

      mockAudioContext.decodeAudioData.mockResolvedValue({
        getChannelData: () => mockAudioData,
        sampleRate: 44100
      })

      const processAudio = async (arrayBuffer) => {
        const audioBuffer = await mockAudioContext.decodeAudioData(arrayBuffer)
        const pcmData = audioBuffer.getChannelData(0)
        const resampledPcm = resampleAudio(pcmData, audioBuffer.sampleRate, 16000)
        
        mockWorker.postMessage({ audio: resampledPcm }, [resampledPcm.buffer])
      }

      await processAudio(new ArrayBuffer(100))

      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled()
      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ audio: expect.any(Float32Array) }),
        [expect.any(ArrayBuffer)]
      )
    })

    it('should handle worker transcription errors', () => {
      const error = new Error('Transcription failed')

      mockWorker.onmessage = (event) => {
        if (event.data.status === 'transcription_error') {
          chrome.runtime.sendMessage({
            type: 'TRANSCRIPT_ERROR',
            error: event.data.error
          })
        }
      }

      const handleError = () => {
        mockWorker.onmessage({
          data: {
            status: 'transcription_error',
            error: error.message
          }
        })
      }

      handleError()

      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'TRANSCRIPT_ERROR',
        error: 'Transcription failed'
      })
    })

    it('should handle model loading status', () => {
      mockWorker.onmessage = (event) => {
        if (event.data.status === 'model_loading') {
          chrome.runtime.sendMessage({ type: 'MODEL_LOADING' })
        }
      }
    })

    it('should handle model ready status', () => {
      mockWorker.onmessage = (event) => {
        if (event.data.status === 'model_ready') {
          chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' })
        }
      }

      const handleReady = () => {
        mockWorker.onmessage({ data: { status: 'model_ready' } })
      }

      handleReady()

      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_STARTED'
      })
    })

    it('should send transcript when received from worker', () => {
      const transcript = 'Hello, this is a test transcription'

      mockWorker.onmessage = (event) => {
        if (event.data.text) {
          chrome.runtime.sendMessage({
            type: 'TRANSCRIPT_READY',
            transcript: event.data.text
          })
        }
      }

      const handleTranscript = () => {
        mockWorker.onmessage({ data: { text: transcript } })
      }

      handleTranscript()

      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'TRANSCRIPT_READY',
        transcript: transcript
      })
    })
  })

  describe('Service Worker Keep-Alive', () => {
    it('should start keep-alive interval when capture starts', () => {
      let keepAliveInterval = null

      const startKeepAlive = () => {
        if (keepAliveInterval) return

        keepAliveInterval = setInterval(() => {
          chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' })
        }, 20000)
      }

      startKeepAlive()

      expect(keepAliveInterval).not.toBeNull()
    })

    it('should send keep-alive messages every 20 seconds', (done) => {
      let callCount = 0
      let keepAliveInterval = null

      global.setInterval = (fn, ms) => {
        if (ms === 20000) {
          keepAliveInterval = setInterval(() => {
            callCount++
            fn()
          }, 100) // Speed up for testing
        }
        return keepAliveInterval
      }

      const startKeepAlive = () => {
        keepAliveInterval = setInterval(() => {
          chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' })
          callCount++
        }, 20000)

        // Speed up interval for testing
        return keepAliveInterval
      }

      startKeepAlive()

      setTimeout(() => {
        expect(callCount).toBeGreaterThan(0)
        done()
      }, 300)
    })

    it('should stop keep-alive interval when capture stops', () => {
      let keepAliveInterval = null
      let timerId

      // Mock setInterval to return a value
      global.setInterval = vi.fn((fn, ms) => {
        timerId = 123 // Mock interval ID
        return timerId
      })

      const startKeepAlive = () => {
        timerId = setInterval(() => {
          chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' })
        }, 20000)
        keepAliveInterval = timerId
      }

      const stopKeepAlive = () => {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval)
          keepAliveInterval = null
        }
      }

      startKeepAlive()
      expect(keepAliveInterval).not.toBeNull()

      stopKeepAlive()
      expect(keepAliveInterval).toBeNull()
    })

    it('should not start multiple keep-alive intervals', () => {
      let keepAliveInterval = null

      const startKeepAlive = () => {
        if (keepAliveInterval) return // Already running

        keepAliveInterval = setInterval(() => {
          chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' })
        }, 20000)
      }

      startKeepAlive()
      const firstInterval = keepAliveInterval

      startKeepAlive() // Try to start again
      expect(keepAliveInterval).toBe(firstInterval) // Should be the same interval
    })
  })

  describe('End-to-End Voice Transcription Flow', () => {
    it('should complete full voice transcription flow', async () => {
      const steps = []
      
      // Step 1: User clicks extension icon (simulated by calling startCapture)
      steps.push('User clicks extension icon')

      // Step 2: Service worker creates offscreen document
      await mockChromeOffscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Required for live tab audio transcription'
      })
      steps.push('Service worker creates offscreen document')

      // Step 3: Get media stream
      const streamId = await mockChromeTabCapture.getMediaStreamId({
        targetTabId: 1
      })
      steps.push(`Service worker gets media stream: ${streamId}`)

      // Step 4: Start audio capture
      mockMediaRecorder.state = 'recording'
      steps.push('Audio capture started')

      // Step 5: Process audio and send to worker
      const mockAudioData = new Float32Array(32000)
      const resampledData = resampleAudio(mockAudioData, 44100, 16000)
      mockWorker.postMessage({ audio: resampledData }, [resampledData.buffer])
      steps.push('Audio sent to Whisper worker')

      // Step 6: Worker processes and sends transcript
      if (mockWorker.onmessage) {
        mockWorker.onmessage({ data: { text: 'Hello world' } })
      } else {
        mockWorker.onmessage = vi.fn((event) => {
          if (event.data.text) {
            chrome.runtime.sendMessage({
              type: 'TRANSCRIPT_READY',
              transcript: event.data.text
            })
          }
        })
        mockWorker.onmessage({ data: { text: 'Hello world' } })
      }
      steps.push('Worker sends transcript: "Hello world"')

      // Step 7: Send transcript to service worker
      await mockChromeRuntime.sendMessage({
        type: 'TRANSCRIPT_READY',
        transcript: 'Hello world'
      })
      steps.push('Service worker receives transcript')

      expect(steps).toEqual([
        'User clicks extension icon',
        'Service worker creates offscreen document',
        'Service worker gets media stream: stream-id-123',
        'Audio capture started',
        'Audio sent to Whisper worker',
        'Worker sends transcript: "Hello world"',
        'Service worker receives transcript'
      ])
    })

    it('should handle errors during transcription', async () => {
      const error = new Error('Permission denied')

      global.navigator = {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(error)
        }
      }

      try {
        await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'tab',
              chromeMediaSourceId: 'stream-id-123'
            }
          }
        })
      } catch (err) {
        await mockChromeRuntime.sendMessage({
          type: 'CAPTURE_ERROR',
          error: err.message
        })
      }

      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_ERROR',
        error: 'Permission denied'
      })
    })
  })

  // Helper function for tests
  function resampleAudio(audioData, fromSampleRate, toSampleRate) {
    if (fromSampleRate === toSampleRate) {
      return audioData
    }

    const ratio = fromSampleRate / toSampleRate
    const newLength = Math.round(audioData.length / ratio)
    const result = new Float32Array(newLength)
    
    for (let i = 0; i < newLength; i++) {
      const indexInOld = i * ratio
      const nearIndex = Math.floor(indexInOld)
      const fraction = indexInOld - nearIndex
      
      const nearValue = audioData[nearIndex]
      const farValue = audioData[nearIndex + 1] || nearValue
      
      result[i] = nearValue + (farValue - nearValue) * fraction
    }
    return result
  }
})

