const toIco = require('to-ico');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../resource/logo.png');
const icoPath = path.join(__dirname, '../resource/logo.ico');

async function convertIcon() {
  try {
    console.log('Converting PNG to ICO...');
    
    // Resize PNG to multiple sizes for Windows ICO
    // Windows needs multiple sizes for different contexts (Explorer, taskbar, etc.)
    const sizes = [16, 32, 48, 64, 128, 256];
    const buffers = await Promise.all(
      sizes.map(size => 
        sharp(pngPath)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
      )
    );
    
    // Convert to ICO
    const icoBuffer = await toIco(buffers);
    
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`✅ Icon converted successfully: ${icoPath}`);
  } catch (error) {
    console.error('❌ Error converting icon:', error);
    process.exit(1);
  }
}

convertIcon();
