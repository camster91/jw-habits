import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// JW blue color
const primaryColor = '#4A6FA4';
const textColor = '#FFFFFF';

// Create SVG with "JW" text
function createSvg(size) {
  const fontSize = Math.round(size * 0.4);
  const padding = Math.round(size * 0.15);

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${padding}" fill="${primaryColor}"/>
      <text
        x="50%"
        y="55%"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${textColor}"
        text-anchor="middle"
        dominant-baseline="middle"
      >JW</text>
    </svg>
  `;
}

async function generateIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    const svg = createSvg(size);
    const outputPath = join(publicDir, `pwa-${size}x${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`Generated: pwa-${size}x${size}.png`);
  }

  // Also create apple-touch-icon (180x180)
  const appleSvg = createSvg(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated: apple-touch-icon.png');

  // Create favicon
  const faviconSvg = createSvg(32);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('Generated: favicon.ico');
}

generateIcons().catch(console.error);
