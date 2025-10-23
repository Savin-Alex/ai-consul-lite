/**
 * Whisper Worker for AI Consul Lite
 * Handles ONNX model inference for speech-to-text transcription
 */

import { pipeline, env } from '@xenova/transformers'

// Skip local model check (we are bundling) and use bundled models
env.allowLocalModels = false
env.useBrowserCache = false

// The path to our bundled model
const MODEL_PATH = 'assets/models/whisper-tiny.en/'

// Singleton pattern to load the model only once
class WhisperPipeline {
  static task = 'automatic-speech-recognition'
  static instance = null

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Send a "loading" message
      self.postMessage({ status: 'model_loading' })
      
      try {
        this.instance = pipeline(this.task, MODEL_PATH, { progress_callback })
      } catch (error) {
        console.error('Failed to load Whisper model:', error)
        self.postMessage({ 
          status: 'model_error', 
          error: error.message 
        })
        throw error
      }
    }
    return this.instance
  }
}

// Listen for messages from offscreen.js
self.onmessage = async (event) => {
  const { audio } = event.data // Receives Float32Array

  try {
    const transcriber = await WhisperPipeline.getInstance()

    // Model is loaded (or was already loaded), send "ready"
    self.postMessage({ status: 'model_ready' })
    
    const transcript = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'en',
      task: 'transcribe',
    })

    // Send the result back to offscreen.js
    if (transcript && transcript.text) {
      self.postMessage({ text: transcript.text.trim() })
    } else {
      self.postMessage({ text: '' })
    }
  } catch (error) {
    console.error('Transcription error:', error)
    self.postMessage({ 
      status: 'transcription_error', 
      error: error.message 
    })
  }
}
