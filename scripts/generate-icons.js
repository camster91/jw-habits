import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Buffer } from 'node:buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// Brand colour, matching the manifest theme_color.
const primaryColor = '#4A6FA4';
const markColor = '#FFFFFF';

/**
 * The app mark: a simple check inside a rounded square. Deliberately
 * letter-free — a monogram ties the icon to a specific name, and this app
 * is a general habit tracker.
 *
 * `safeZone` controls the inset for maskable icons. A maskable icon can be
 * cropped to a circle or squircle by the launcher, so all meaningful
 * content must sit inside the inner 80%. For the plain icon the mark can
 * use more of the canvas.
 */
function createSvg(size, { maskable = false } = {}) {
  const scale = maskable ? 0.55 : 0.72;
  const pad = Math.round(size * (maskable ? 0.22 : 0.15));
  const stroke = Math.max(2, Math.round(size * 0.055 * scale));

  // Checkmark geometry, centred and sized by `scale`.
  const cx = size / 2;
  const cy = size / 2;
  const arm = size * scale * 0.5;
  const points = [
    [cx - arm * 0.78, cy + arm * 0.06],
    [cx - arm * 0.2, cy + arm * 0.6],
    [cx + arm * 0.8, cy - arm * 0.55],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${pad}" fill="${primaryColor}"/>
      <polyline
        points="${points}"
        fill="none"
        stroke="${markColor}"
        stroke-width="${stroke}"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

async function render(size, filename, opts) {
  const svg = createSvg(size, opts);
  await sharp(Buffer.from(svg)).png().toFile(join(publicDir, filename));
  console.log(`Generated: ${filename} (${size}x${size}${opts?.maskable ? ', maskable' : ''})`);
}

async function generateIcons() {
  await render(192, 'pwa-192x192.png');
  await render(512, 'pwa-512x512.png');
  // Maskable gets a bigger inset so a launcher crop cannot clip the mark.
  await render(512, 'pwa-maskable-512x512.png', { maskable: true });
  await render(180, 'apple-touch-icon.png');
  await render(32, 'favicon-32x32.png');
  await render(16, 'favicon-16x16.png');

  // favicon.ico: sharp writes a PNG payload; name it as an ico for the
  // legacy path, matching the previous behaviour.
  await render(48, 'favicon.ico');
}

generateIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
