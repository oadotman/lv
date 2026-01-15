const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateFavicons() {
  try {
    const logoPath = path.join(__dirname, '../public/loadvoice-logo.svg');
    const publicDir = path.join(__dirname, '../public');

    // Check if logo exists
    try {
      await fs.access(logoPath);
    } catch (error) {
      console.error('Logo file not found at:', logoPath);
      return;
    }

    console.log('Generating favicons from logo...');

    // Generate favicon-16x16.png
    await sharp(logoPath)
      .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    console.log('✓ Generated favicon-16x16.png');

    // Generate favicon-32x32.png
    await sharp(logoPath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✓ Generated favicon-32x32.png');

    // Generate android-chrome-192x192.png
    await sharp(logoPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'android-chrome-192x192.png'));
    console.log('✓ Generated android-chrome-192x192.png');

    // Generate android-chrome-512x512.png
    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'android-chrome-512x512.png'));
    console.log('✓ Generated android-chrome-512x512.png');

    // Generate apple-touch-icon.png (180x180)
    await sharp(logoPath)
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✓ Generated apple-touch-icon.png');

    // Generate favicon.ico (multi-size)
    // For ICO, we'll use the 32x32 version as a simple approach
    await sharp(logoPath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✓ Generated favicon.ico');

    console.log('\n✅ All favicons generated successfully!');

  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons();