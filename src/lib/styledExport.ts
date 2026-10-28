import jsQR from 'jsqr';

export type StyledTemplate = 'card' | 'sticker' | 'poster' | 'badge';
export type AccentColor = 'orange' | 'pink' | 'lime' | 'teal' | 'purple';

export interface StyledExportOptions {
  template: StyledTemplate;
  payload: string;
  host: string;
  platform?: string;
  accent: AccentColor;
  customText?: string;
  showHost: boolean;
  showCredit: boolean;
}

const ACCENT_COLORS: Record<AccentColor, string> = {
  orange: '#ff6b2b',
  pink: '#f472b6',
  lime: '#c6f432',
  teal: '#2dd4bf',
  purple: '#a78bfa',
};

// Helper: draw rounded rectangle using arcTo
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Helper: draw dot grid
function drawDotGrid(ctx: CanvasRenderingContext2D, width: number, height: number, u: number) {
  ctx.fillStyle = 'rgba(17, 17, 17, 0.12)';
  const spacing = 22 * u;
  for (let x = 0; x < width; x += spacing) {
    for (let y = 0; y < height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Helper: fit text with ellipsis
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  minScale: number = 0.6
): { text: string; fontSize: number } {
  let currentSize = fontSize;
  let currentText = text;
  
  while (currentSize >= fontSize * minScale) {
    ctx.font = `800 ${currentSize}px "Bricolage Grotesque", system-ui`;
    const metrics = ctx.measureText(currentText);
    if (metrics.width <= maxWidth) {
      return { text: currentText, fontSize: currentSize };
    }
    currentSize -= 2;
  }
  
  // Truncate with ellipsis
  currentSize = fontSize * minScale;
  ctx.font = `800 ${currentSize}px "Bricolage Grotesque", system-ui`;
  while (currentText.length > 0) {
    const testText = currentText + '...';
    const metrics = ctx.measureText(testText);
    if (metrics.width <= maxWidth) {
      return { text: testText, fontSize: currentSize };
    }
    currentText = currentText.slice(0, -1);
  }
  
  return { text: '...', fontSize: currentSize };
}

// Helper: draw tag with rotation
function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bgColor: string,
  textColor: string,
  rotation: number,
  u: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation * Math.PI / 180);
  
  ctx.font = `700 ${16 * u}px "Bricolage Grotesque", system-ui`;
  const metrics = ctx.measureText(text);
  const padding = 12 * u;
  const width = metrics.width + padding * 2;
  const height = 32 * u;
  
  // Shadow
  ctx.fillStyle = '#111';
  rr(ctx, -width / 2 + 3 * u, -height / 2 + 3 * u, width, height, 10 * u);
  ctx.fill();
  
  // Background
  ctx.fillStyle = bgColor;
  rr(ctx, -width / 2, -height / 2, width, height, 10 * u);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  
  // Text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  
  ctx.restore();
}

// Main export function
export async function generateStyledExport(
  qrCanvas: HTMLCanvasElement,
  options: StyledExportOptions
): Promise<Blob> {
  // Load fonts
  try {
    await Promise.all([
      document.fonts.load('800 48px "Bricolage Grotesque"'),
      document.fonts.load('400 32px "DM Sans"'),
      document.fonts.load('500 24px "JetBrains Mono"'),
    ]);
  } catch {
    // Fall back to system-ui
  }
  
  const { template, payload, host, platform, accent, customText, showHost, showCredit } = options;
  const accentColor = ACCENT_COLORS[accent];
  
  let width: number, height: number;
  
  switch (template) {
    case 'card':
      width = 1600;
      height = 1600;
      break;
    case 'sticker':
      width = 1600;
      height = 1600;
      break;
    case 'poster':
      width = 1600;
      height = 2200;
      break;
    case 'badge':
      width = 2000;
      height = 1000;
      break;
  }
  
  const u = width / 800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Template-specific rendering
  switch (template) {
    case 'card':
      await renderCard(ctx, qrCanvas, width, height, u, host, platform, accentColor, showHost);
      break;
    case 'sticker':
      await renderSticker(ctx, qrCanvas, width, height, u, accentColor);
      break;
    case 'poster':
      await renderPoster(ctx, qrCanvas, width, height, u, host, customText || 'Scan me.', showHost, showCredit);
      break;
    case 'badge':
      await renderBadge(ctx, qrCanvas, width, height, u, host, customText || 'Scan me.', 'Quick access', showHost);
      break;
  }
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });
}

// Card template
async function renderCard(
  ctx: CanvasRenderingContext2D,
  qrCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  u: number,
  host: string,
  platform: string | undefined,
  accentColor: string,
  showHost: boolean
) {
  // Background
  ctx.fillStyle = '#fdf3df';
  ctx.fillRect(0, 0, width, height);
  drawDotGrid(ctx, width, height, u);
  
  // Tile dimensions
  const tileSize = 1000 * u;
  const tileX = (width - tileSize) / 2;
  const tileY = (height - tileSize) / 2;
  
  // Shadow
  ctx.fillStyle = '#111';
  rr(ctx, tileX + 8 * u, tileY + 8 * u, tileSize, tileSize, 24 * u);
  ctx.fill();
  
  // Tile
  ctx.fillStyle = '#fffef9';
  rr(ctx, tileX, tileY, tileSize, tileSize, 24 * u);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  
  // QR image with padding
  const qrPadding = 80 * u;
  const qrSize = tileSize - qrPadding * 2;
  ctx.drawImage(qrCanvas, tileX + qrPadding, tileY + qrPadding, qrSize, qrSize);
  
  // "SCAN ME" tag (top-left, tilted -4deg)
  drawTag(ctx, 'SCAN ME', tileX + 100 * u, tileY + 60 * u, '#f472b6', '#111', -4, u);
  
  // Host tag (bottom-right, tilted +3deg)
  if (showHost) {
    const displayHost = host.length > 20 ? host.substring(0, 17) + '...' : host;
    drawTag(ctx, displayHost, tileX + tileSize - 150 * u, tileY + tileSize - 60 * u, accentColor, '#111', 3, u);
  }
  
  // Platform chip (if detected)
  if (platform && platform !== 'Generic') {
    drawTag(ctx, platform, tileX + tileSize - 100 * u, tileY + 60 * u, '#2dd4bf', '#111', 0, u);
  }
}

// Sticker template
async function renderSticker(
  ctx: CanvasRenderingContext2D,
  qrCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  u: number,
  accentColor: string
) {
  // Transparent background (no fill)
  ctx.clearRect(0, 0, width, height);
  
  // Tile dimensions
  const tileSize = 1200 * u;
  const tileX = (width - tileSize) / 2;
  const tileY = (height - tileSize) / 2;
  
  // Shadow
  ctx.fillStyle = '#111';
  rr(ctx, tileX + 8 * u, tileY + 8 * u, tileSize, tileSize, 24 * u);
  ctx.fill();
  
  // Tile with thick border
  ctx.fillStyle = '#fffef9';
  rr(ctx, tileX, tileY, tileSize, tileSize, 24 * u);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 12 * u;
  ctx.stroke();
  
  // QR image with padding
  const qrPadding = 100 * u;
  const qrSize = tileSize - qrPadding * 2;
  ctx.drawImage(qrCanvas, tileX + qrPadding, tileY + qrPadding, qrSize, qrSize);
  
  // "SCAN ME" strip at bottom (inside tile, below quiet zone)
  const stripHeight = 80 * u;
  const stripY = tileY + tileSize - stripHeight - 40 * u;
  
  ctx.fillStyle = accentColor;
  ctx.fillRect(tileX + 20 * u, stripY, tileSize - 40 * u, stripHeight);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * u;
  ctx.strokeRect(tileX + 20 * u, stripY, tileSize - 40 * u, stripHeight);
  
  ctx.font = `800 ${32 * u}px "Bricolage Grotesque", system-ui`;
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCAN ME', width / 2, stripY + stripHeight / 2);
}

// Poster template
async function renderPoster(
  ctx: CanvasRenderingContext2D,
  qrCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  u: number,
  host: string,
  heading: string,
  showHost: boolean,
  showCredit: boolean
) {
  // Background
  ctx.fillStyle = '#fdf3df';
  ctx.fillRect(0, 0, width, height);
  drawDotGrid(ctx, width, height, u);
  
  // Heading box at top
  const headingY = 150 * u;
  const headingHeight = 200 * u;
  
  ctx.font = `800 80px "Bricolage Grotesque", system-ui`;
  const words = heading.split(' ');
  const lastWord = words.pop() || '';
  const headingText = words.join(' ');
  
  // Measure and fit text
  const maxWidth = width - 200 * u;
  const fitted = fitText(ctx, headingText, maxWidth - 200 * u, 80 * u);
  
  // Heading background
  ctx.fillStyle = '#fffef9';
  rr(ctx, 100 * u, headingY, width - 200 * u, headingHeight, 24 * u);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  
  // Heading text
  ctx.font = `800 ${fitted.fontSize}px "Bricolage Grotesque", system-ui`;
  ctx.fillStyle = '#111';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitted.text, 150 * u, headingY + headingHeight / 2);
  
  // Last word on lime highlight
  const lastWordMetrics = ctx.measureText(lastWord);
  const highlightX = 150 * u + ctx.measureText(fitted.text).width + 20 * u;
  const highlightWidth = lastWordMetrics.width + 40 * u;
  
  ctx.save();
  ctx.translate(highlightX + highlightWidth / 2, headingY + headingHeight / 2);
  ctx.rotate(-1 * Math.PI / 180);
  
  ctx.fillStyle = '#c6f432';
  ctx.fillRect(-highlightWidth / 2, -40 * u, highlightWidth, 80 * u);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * u;
  ctx.strokeRect(-highlightWidth / 2, -40 * u, highlightWidth, 80 * u);
  
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.fillText(lastWord, 0, 0);
  ctx.restore();
  
  // Tile in middle
  const tileSize = 1200 * u;
  const tileX = (width - tileSize) / 2;
  const tileY = 500 * u;
  
  // Shadow
  ctx.fillStyle = '#111';
  rr(ctx, tileX + 8 * u, tileY + 8 * u, tileSize, tileSize, 24 * u);
  ctx.fill();
  
  // Tile
  ctx.fillStyle = '#fffef9';
  rr(ctx, tileX, tileY, tileSize, tileSize, 24 * u);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  
  // QR image
  const qrPadding = 100 * u;
  const qrSize = tileSize - qrPadding * 2;
  ctx.drawImage(qrCanvas, tileX + qrPadding, tileY + qrPadding, qrSize, qrSize);
  
  // Footer
  const footerY = height - 200 * u;
  
  if (showHost) {
    ctx.font = `500 32px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(host, width / 2, footerY);
  }
  
  if (showCredit) {
    ctx.font = `600 24px "Bricolage Grotesque", system-ui`;
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.fillText('Made with QRLink', width / 2, footerY + 60 * u);
  }
}

// Badge template
async function renderBadge(
  ctx: CanvasRenderingContext2D,
  qrCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  u: number,
  host: string,
  title: string,
  subtitle: string,
  showHost: boolean
) {
  // Background
  ctx.fillStyle = '#fdf3df';
  ctx.fillRect(0, 0, width, height);
  drawDotGrid(ctx, width, height, u);
  
  // Tile at left
  const tileSize = 700 * u;
  const tileX = 150 * u;
  const tileY = (height - tileSize) / 2;
  
  // Shadow
  ctx.fillStyle = '#111';
  rr(ctx, tileX + 8 * u, tileY + 8 * u, tileSize, tileSize, 24 * u);
  ctx.fill();
  
  // Tile
  ctx.fillStyle = '#fffef9';
  rr(ctx, tileX, tileY, tileSize, tileSize, 24 * u);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  
  // QR image
  const qrPadding = 60 * u;
  const qrSize = tileSize - qrPadding * 2;
  ctx.drawImage(qrCanvas, tileX + qrPadding, tileY + qrPadding, qrSize, qrSize);
  
  // Teal panel at right
  const panelX = tileX + tileSize + 100 * u;
  const panelWidth = width - panelX - 150 * u;
  const panelHeight = 600 * u;
  const panelY = (height - panelHeight) / 2;
  
  // Panel shadow
  ctx.fillStyle = '#111';
  rr(ctx, panelX + 8 * u, panelY + 8 * u, panelWidth, panelHeight, 24 * u);
  ctx.fill();
  
  // Panel
  ctx.fillStyle = '#2dd4bf';
  rr(ctx, panelX, panelY, panelWidth, panelHeight, 24 * u);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  
  // Title
  const titleFitted = fitText(ctx, title, panelWidth - 80 * u, 64 * u);
  ctx.font = `800 ${titleFitted.fontSize}px "Bricolage Grotesque", system-ui`;
  ctx.fillStyle = '#111';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(titleFitted.text, panelX + 40 * u, panelY + 60 * u);
  
  // Subtitle
  const subtitleFitted = fitText(ctx, subtitle, panelWidth - 80 * u, 36 * u);
  ctx.font = `400 ${subtitleFitted.fontSize}px "DM Sans", system-ui`;
  ctx.fillStyle = '#111';
  ctx.fillText(subtitleFitted.text, panelX + 40 * u, panelY + 180 * u);
  
  // Host
  if (showHost) {
    const hostFitted = fitText(ctx, host, panelWidth - 80 * u, 28 * u, 0.5);
    ctx.font = `500 ${hostFitted.fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#111';
    ctx.fillText(hostFitted.text, panelX + 40 * u, panelY + 280 * u);
  }
}

// Verification function with multi-step pipeline
export async function verifyStyledExport(
  canvas: HTMLCanvasElement,
  expectedPayload: string
): Promise<{ verified: boolean; method: string }> {
  // Step 1: Try BarcodeDetector if available
  if ('BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(canvas);
      const qrCode = barcodes.find((b: any) => b.format === 'qr_code');
      if (qrCode?.rawValue === expectedPayload) {
        return { verified: true, method: 'BarcodeDetector' };
      }
    } catch (e) {
      // Continue to next method
    }
  }
  
  // Step 2: Crop to QR + quiet zone and try jsQR at various sizes
  const crop = cropToQRWithQuietZone(canvas);
  
  // Try at 800px
  const crop800 = resizeCanvas(crop, 800);
  if (await verifyWithJsQR(crop800, expectedPayload)) {
    return { verified: true, method: 'jsQR 800px crop' };
  }
  
  // Try at 500px
  const crop500 = resizeCanvas(crop, 500);
  if (await verifyWithJsQR(crop500, expectedPayload)) {
    return { verified: true, method: 'jsQR 500px crop' };
  }
  
  // Step 3: Try grayscale with contrast stretch
  const grayscale = convertToGrayscale(crop800);
  if (await verifyWithJsQR(grayscale, expectedPayload)) {
    return { verified: true, method: 'jsQR grayscale' };
  }
  
  // Step 4: Try forced black (remove color/softness)
  const forcedBlack = forceBlackModules(crop800);
  if (await verifyWithJsQR(forcedBlack, expectedPayload)) {
    return { verified: true, method: 'jsQR forced black' };
  }
  
  return { verified: false, method: 'none' };
}

async function verifyWithJsQR(canvas: HTMLCanvasElement, expectedPayload: string): Promise<boolean> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  
  return code?.data === expectedPayload;
}

function cropToQRWithQuietZone(tileCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const S = tileCanvas.width;
  
  // Recalculate the same geometry as renderTileCanvas
  const T = 0.76 * S;
  const off = 0.03 * S;
  const x = (S - (T + off)) / 2;
  const P = 0.09 * T;
  const Q = T - 2 * P;
  const qrX = x + P;
  const qrY = x + P;
  
  const crop = document.createElement('canvas');
  crop.width = Q;
  crop.height = Q;
  const ctx = crop.getContext('2d')!;
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, Q, Q);
  
  // Draw QR from tile
  ctx.drawImage(tileCanvas, qrX, qrY, Q, Q, 0, 0, Q, Q);
  
  return crop;
}

function resizeCanvas(source: HTMLCanvasElement, targetSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d')!;
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetSize, targetSize);
  
  return canvas;
}

function convertToGrayscale(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Find min/max for contrast stretch
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }
  
  // Apply contrast stretch
  const range = max - min || 1;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const stretched = ((gray - min) / range) * 255;
    data[i] = data[i + 1] = data[i + 2] = stretched;
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function forceBlackModules(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Force non-white pixels to black
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightness = (r + g + b) / 3;
    
    if (brightness < 240) { // Not white
      data[i] = data[i + 1] = data[i + 2] = 0; // Force black
    } else {
      data[i] = data[i + 1] = data[i + 2] = 255; // Force white
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Tile canvas renderer (default export style)
// Crop QR canvas to bounding box of non-background pixels
function contentBox(src: HTMLCanvasElement) {
  const ctx = src.getContext('2d')!;
  const { width: w, height: h } = src;
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3], lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (a > 20 && lum < 235) { // non-white, non-transparent
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w, h };
  const side = Math.max(maxX - minX + 1, maxY - minY + 1);
  return { x: minX, y: minY, w: side, h: side };
}

export function renderTileCanvas(qr: HTMLCanvasElement, S = 1600, transparent = false) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  if (!transparent) { ctx.fillStyle = '#fdf3df'; ctx.fillRect(0, 0, S, S); }

  const T = 0.76 * S;          // tile size
  const off = 0.03 * S;        // shadow offset
  const bw = 0.009 * S;        // border width (~14px at 1600)
  const r = 0.07 * T;          // corner radius
  const x = (S - (T + off)) / 2, y = x;   // centres tile+shadow together

  // 1. SHADOW: solid fill, no stroke
  rr(ctx, x + off, y + off, T, T, r);
  ctx.fillStyle = '#111';
  ctx.fill();

  // 2. TILE: white fill, then one border
  rr(ctx, x, y, T, T, r);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  rr(ctx, x + bw / 2, y + bw / 2, T - bw, T - bw, r - bw / 2);
  ctx.lineWidth = bw;
  ctx.strokeStyle = '#111';
  ctx.stroke();

  // 3. QR: crop to content, draw centred, equal padding
  const P = 0.09 * T;
  const Q = T - 2 * P;
  const b = contentBox(qr);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, b.x, b.y, b.w, b.h, x + P, y + P, Q, Q);
  return c;
}
