/**
 * Simple Test Options Entry Point
 * Minimal test to verify basic functionality
 */

console.log('Test options script loading...')

// Mount simple HTML instead of React
const container = document.getElementById('root')
if (!container) {
  console.error('Root container not found!')
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root container not found</div>'
} else {
  console.log('Root container found, mounting test content...')
  container.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <header style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4688F1; margin-bottom: 8px;">AI Consul Lite Settings</h1>
        <p style="color: #666;">Configure your AI assistant preferences and API keys</p>
      </header>
      
      <main>
        <section style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="margin-bottom: 16px;">LLM Provider</h2>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Choose your preferred AI provider:</label>
            <select style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="google">Google (Gemini Pro)</option>
            </select>
          </div>
        </section>
        
        <section style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="margin-bottom: 16px;">API Key</h2>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Enter your API key:</label>
            <input type="password" placeholder="Your API key will be stored securely" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <small style="color: #666; font-size: 12px;">Your API key is encrypted and stored locally. We never see your key.</small>
          </div>
          <button style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Connection</button>
        </section>
        
        <section style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="margin-bottom: 16px;">Default Settings</h2>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Default tone for suggestions:</label>
            <select style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
              <option value="formal">Formal</option>
              <option value="semi-formal" selected>Semi-formal</option>
              <option value="friendly">Friendly</option>
              <option value="slang">Slang</option>
            </select>
          </div>
        </section>
        
        <div style="text-align: center; margin-top: 30px;">
          <button style="padding: 12px 24px; background: #4688F1; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px;">Save Settings</button>
          <button style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">Reset to Defaults</button>
        </div>
      </main>
      
      <footer style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
        AI Consul Lite v1.0.0 - Privacy-first AI assistant
      </footer>
    </div>
  `
}
