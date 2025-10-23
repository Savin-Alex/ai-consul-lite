/**
 * Context Merger for AI Consul Lite
 * Handles merging text chat context with voice transcripts
 */

import { getRecentTranscripts } from './storage.js'

/**
 * Merge text chat context with recent voice transcripts
 * @param {Array} textMessages - Array of text message objects
 * @param {number} maxTranscriptAge - Maximum age of transcripts to include (ms)
 * @returns {Array} Merged context array
 */
export async function mergeContext(textMessages, maxTranscriptAge = 300000) { // 5 minutes default
  try {
    // Get recent transcripts
    const recentTranscripts = await getRecentTranscripts(maxTranscriptAge)
    
    if (recentTranscripts.length === 0) {
      return textMessages
    }

    // Create merged context
    const mergedContext = [...textMessages]
    
    // Add recent transcripts as user messages
    for (const transcript of recentTranscripts) {
      // Check if this transcript is already represented in text messages
      const isDuplicate = mergedContext.some(msg => 
        msg.content.includes(transcript.transcript) || 
        transcript.transcript.includes(msg.content)
      )
      
      if (!isDuplicate) {
        mergedContext.push({
          role: 'user',
          content: `[VOICE TRANSCRIPT] ${transcript.transcript}`,
          timestamp: transcript.timestamp,
          source: 'voice'
        })
      }
    }
    
    // Sort by timestamp (oldest first)
    mergedContext.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    
    // Return last 10 messages to keep context manageable
    return mergedContext.slice(-10)
  } catch (error) {
    console.error('Failed to merge context:', error)
    return textMessages
  }
}

/**
 * Format context for LLM consumption
 * @param {Array} context - Merged context array
 * @returns {Array} Formatted context for LLM
 */
export function formatContextForLLM(context) {
  return context.map(msg => ({
    role: msg.role,
    content: msg.content
  }))
}

/**
 * Check if voice transcription is active and recent
 * @param {number} maxAge - Maximum age for recent transcripts (ms)
 * @returns {Promise<boolean>} True if voice is active and recent
 */
export async function isVoiceActive(maxAge = 60000) { // 1 minute default
  try {
    const recentTranscripts = await getRecentTranscripts(maxAge)
    return recentTranscripts.length > 0
  } catch (error) {
    console.error('Failed to check voice activity:', error)
    return false
  }
}
