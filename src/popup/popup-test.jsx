/**
 * Simple Test Popup Entry Point
 * Minimal test to verify basic functionality
 */

console.log('Test popup script loading...')

// Mount simple HTML instead of React
const container = document.getElementById('root')
if (!container) {
  console.error('Root container not found!')
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root container not found</div>'
} else {
  console.log('Root container found, mounting test content...')
  container.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #4688F1; margin-bottom: 16px;">AI Consul Lite</h1>
      <div style="background: #f0f0f0; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
        <strong>Status:</strong> Extension is working!
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" checked> Enable Extension
        </label>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" checked> Enable on this site
        </label>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" checked> Voice transcription
        </label>
      </div>
      <button id="settings-button" style="width: 100%; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
        Settings
      </button>
      <div style="margin-top: 16px; font-size: 12px; color: #666; text-align: center;">
        Voice capture toggled via icon click on supported pages
      </div>
    </div>
  `
  
  // Add event listener for settings button
  const settingsButton = container.querySelector('#settings-button')
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage()
    })
  }
}
