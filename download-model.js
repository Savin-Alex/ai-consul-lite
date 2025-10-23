#!/usr/bin/env node

/**
 * Script to download Whisper-tiny.en model files
 * This script downloads all required model files from HuggingFace
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const MODEL_URL = 'https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/'
const MODEL_DIR = 'src/assets/models/whisper-tiny.en'

// Complete list of required files for Whisper-tiny.en
const REQUIRED_FILES = [
  'config.json',
  'tokenizer.json',
  'onnx/model.onnx',
  'merges.txt',
  'vocab.json',
  'preprocessor_config.json',
  'tokenizer_config.json',
  'special_tokens_map.json'
]

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      } else {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
      }
    }).on('error', reject)
  })
}

async function downloadModel() {
  console.log('🤖 Downloading Whisper-tiny.en model files...')
  console.log('📁 Model directory:', MODEL_DIR)
  console.log('')
  
  // Create directories
  fs.mkdirSync(MODEL_DIR, { recursive: true })
  fs.mkdirSync(path.join(MODEL_DIR, 'onnx'), { recursive: true })
  
  let successCount = 0
  let failCount = 0
  
  for (const file of REQUIRED_FILES) {
    const url = MODEL_URL + file
    const filepath = path.join(MODEL_DIR, file)
    
    console.log(`📥 Downloading ${file}...`)
    
    try {
      await downloadFile(url, filepath)
      console.log(`✅ Downloaded ${file}`)
      successCount++
    } catch (error) {
      console.error(`❌ Failed to download ${file}:`, error.message)
      failCount++
    }
  }
  
  console.log('')
  console.log('📊 Download Summary:')
  console.log(`✅ Successfully downloaded: ${successCount} files`)
  console.log(`❌ Failed downloads: ${failCount} files`)
  
  if (successCount === REQUIRED_FILES.length) {
    console.log('')
    console.log('🎉 Model download complete!')
    console.log('🚀 You can now build the extension with: npm run build')
  } else {
    console.log('')
    console.log('⚠️  Some files failed to download.')
    console.log('🔗 Manual download: https://huggingface.co/Xenova/whisper-tiny.en')
    console.log('📝 Download all files and place them in:', MODEL_DIR)
  }
}

if (require.main === module) {
  downloadModel().catch(console.error)
}

module.exports = { downloadModel }
