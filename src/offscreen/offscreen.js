/**
 * Offscreen Document for AI Consul Lite
 * Handles audio capture, loopback fix, and communication with Whisper worker
 */

let audioContext
let streamSource
let mediaRecorder
let whisperWorker

/**
 * Resamples a Float32Array from a source sample rate to a target sample rate.
 * Uses simple linear interpolation.
 */
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
    const farValue = audioData[nearIndex + 1]
    
    result[i] = nearValue + (farValue - nearValue) * fraction
  }
  return result
}

/**
 * Start audio capture with the provided stream ID
 */
async function startCapture(streamId) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    return // Already capturing
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    })

    // --- FIX FOR TAB MUTING BUG ---
    // 1. Create an AudioContext
    audioContext = new AudioContext()
    // 2. Create a MediaStreamSource from the captured stream
    streamSource = audioContext.createMediaStreamSource(stream)
    // 3. Connect the source to the default speaker output
    streamSource.connect(audioContext.destination)
    // The tab's audio is now audible again.
    // ------------------------------

    // Initialize the Web Worker
    if (!whisperWorker) {
      whisperWorker = new Worker('workers/whisper-worker.js', { type: 'module' })
      whisperWorker.onmessage = (e) => {
        if (e.data.text) {
          // Received transcription
          chrome.runtime.sendMessage({
            type: 'TRANSCRIPT_READY',
            transcript: e.data.text
          })
        }
        if (e.data.status === 'model_loading') {
          // Pass this up to the service worker
          chrome.runtime.sendMessage({ type: 'MODEL_LOADING' })
        }
        if (e.data.status === 'model_ready') {
          // Pass this up to the service worker
          chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' })
        }
      }
    }

    // Initialize MediaRecorder
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const arrayBuffer = await event.data.arrayBuffer()
        
        // We must use a *new* context to decode, as the main audioContext
        // might have a different sample rate.
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        const pcmData = audioBuffer.getChannelData(0)
        const originalSampleRate = audioBuffer.sampleRate

        // --- CRITICAL RESAMPLING STEP ---
        const resampledPcm = resampleAudio(pcmData, originalSampleRate, 16000) // 16kHz for Whisper
        // ---------------------------------

        // Send the *resampled* audio to the worker
        whisperWorker.postMessage({ audio: resampledPcm }, [resampledPcm.buffer])
      }
    }

    // Slice audio every 2 seconds
    mediaRecorder.start(2000)
    
    console.log('Audio capture started successfully')
  } catch (error) {
    console.error('Failed to start audio capture:', error)
    chrome.runtime.sendMessage({ 
      type: 'CAPTURE_ERROR', 
      error: error.message 
    })
  }
}

/**
 * Stop audio capture
 */
function stopCapture() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
  
  if (streamSource) {
    streamSource.disconnect()
    streamSource = null
  }
  
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  
  if (whisperWorker) {
    whisperWorker.terminate()
    whisperWorker = null
  }
  
  console.log('Audio capture stopped')
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'offscreen') return

  if (msg.type === 'START_CAPTURE') {
    startCapture(msg.streamId)
  }

  if (msg.type === 'STOP_CAPTURE') {
    stopCapture()
  }
})
