const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 90;
const LIMIT = WIDTH - MARGIN * 2;

function fit(ctx, text) {
  const chars = Array.from(String(text));
  if (ctx.measureText(chars.join('')).width <= LIMIT) return chars.join('');
  while (chars.length && ctx.measureText(chars.join('') + '…').width > LIMIT) chars.pop();
  return chars.join('') + '…';
}

/** 1080 × 1350 PNG layout. Code-point splitting preserves emoji pairs. */
export function drawCard(canvas, { copy, colour = '#36754a', gardenStage = 0, kind }) {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#f8f5ec';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, WIDTH, 24);
  ctx.fillStyle = '#263b30';
  ctx.font = 'bold 64px sans-serif';
  const remaining = Array.from(String(copy.title));
  const titles = [];
  for (let line = 0; line < 3 && remaining.length; line++) {
    if (line === 2) {
      titles.push(fit(ctx, remaining.join('')));
      break;
    }
    let chunk = '';
    while (remaining.length && ctx.measureText(chunk + remaining[0]).width <= LIMIT)
      chunk += remaining.shift();
    if (!chunk) {
      titles.push(fit(ctx, remaining.join('')));
      break;
    }
    titles.push(chunk.trim());
  }
  titles.forEach((line, i) => ctx.fillText(line, MARGIN, 180 + i * 85));
  ctx.font = '40px sans-serif';
  copy.lines.slice(0, 8).forEach((line, i) => ctx.fillText(fit(ctx, line), MARGIN, 480 + i * 65));
  if (kind === 'garden') {
    ctx.fillStyle = '#94704f';
    ctx.beginPath();
    ctx.ellipse(540, 1050, 230, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#36754a';
    if (gardenStage === 0) {
      ctx.beginPath();
      ctx.ellipse(540, 1030, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(533, 1020 - gardenStage * 42, 14, gardenStage * 42);
      ctx.beginPath();
      ctx.ellipse(
        540,
        1000 - gardenStage * 42,
        50 + gardenStage * 12,
        35 + gardenStage * 8,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
  // Original sprout mark; no third-party text or logos.
  ctx.strokeStyle = '#36754a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(90, 1240);
  ctx.lineTo(90, 1200);
  ctx.stroke();
  ctx.fillStyle = '#36754a';
  ctx.beginPath();
  ctx.ellipse(102, 1203, 16, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '32px sans-serif';
  ctx.fillStyle = '#263b30';
  ctx.fillText('Faithful Days', 130, 1240);
}

export async function createCard(options) {
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(WIDTH, HEIGHT)
      : document.createElement('canvas');
  drawCard(canvas, options);
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas unavailable'))),
      'image/png'
    )
  );
}
