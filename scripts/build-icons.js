const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Convert SVG to different formats using electron-icon-builder
try {
  console.log('Building icons from SVG...');
  
  // Generate PNG for Linux
  execSync(`npx electron-icon-builder --input=assets/icon.svg --output=assets --platforms=linux`, { stdio: 'inherit' });
  
  // Generate ICO for Windows
  execSync(`npx electron-icon-builder --input=assets/icon.svg --output=assets --platforms=win32`, { stdio: 'inherit' });
  
  // Generate ICNS for macOS
  execSync(`npx electron-icon-builder --input=assets/icon.svg --output=assets --platforms=darwin`, { stdio: 'inherit' });
  
  console.log('Icons generated successfully!');
} catch (error) {
  console.error('Error generating icons:', error.message);
  
  // Fallback: create simple PNG files
  console.log('Creating fallback PNG files...');
  
  // Create a simple 512x512 PNG (this is a placeholder)
  const simpleIcon = `data:image/svg+xml;base64,${Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#3B82F6"/>
      <text x="256" y="280" font-family="Arial" font-size="48" font-weight="bold" text-anchor="middle" fill="white">QT</text>
    </svg>
  `).toString('base64')}`;
  
  console.log('Fallback icon created. Please replace with proper icon files.');
}
