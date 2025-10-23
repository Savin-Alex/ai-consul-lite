#!/usr/bin/env node

/**
 * Simple script to create basic extension icons
 * Creates simple PNG icons with the AI Consul Lite branding
 */

const fs = require('fs')
const path = require('path')

// Simple PNG data for a 16x16 blue circle with "AI" text
const createSimpleIcon = (size) => {
  // This is a minimal PNG with a blue circle
  // In a real implementation, you'd use a proper image library
  // For now, we'll create a simple colored square
  
  const canvas = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4688F1" rx="${size/4}"/>
  <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial, sans-serif" font-size="${size/2}" font-weight="bold">AI</text>
</svg>`
  
  return canvas
}

// Create icons directory if it doesn't exist
const iconsDir = 'src/assets/icons'
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Create simple SVG icons (Chrome will accept SVG as PNG)
const sizes = [16, 48, 128]

sizes.forEach(size => {
  const svgContent = createSimpleIcon(size)
  const filename = `icon${size}.png`
  const filepath = path.join(iconsDir, filename)
  
  // For now, save as SVG with .png extension
  // Chrome extensions can handle this
  fs.writeFileSync(filepath, svgContent)
  console.log(`Created ${filename} (${size}x${size})`)
})

console.log('✅ Icons created successfully!')
console.log('Note: These are simple SVG icons saved as .png files.')
console.log('For production, consider using proper PNG icons.')
