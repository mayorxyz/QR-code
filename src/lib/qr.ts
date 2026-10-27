import QRCodeStyling from 'qr-code-styling';
import type { StyleSettings } from './history';

export function createQrInstance(url: string, style: StyleSettings): QRCodeStyling {
  const dotType = style.dotStyle === 'dots' ? 'dots' : style.dotStyle === 'rounded' ? 'rounded' : 'square';
  const cornerDotType = style.cornerStyle === 'dot' ? 'dot' : style.cornerStyle === 'rounded' ? 'rounded' : 'square';
  const cornerSquareType = style.cornerStyle === 'dot' ? 'dot' : style.cornerStyle === 'rounded' ? 'extra-rounded' : 'square';

  const options: any = {
    width: style.size,
    height: style.size,
    type: 'svg',
    data: url,
    margin: 8,
    qrOptions: {
      errorCorrectionLevel: style.errorCorrection,
    },
    dotsOptions: {
      type: dotType,
      color: style.foreground,
    },
    backgroundOptions: {
      color: style.background,
    },
    cornersSquareOptions: {
      type: cornerSquareType,
      color: style.foreground,
    },
    cornersDotOptions: {
      type: cornerDotType,
      color: style.foreground,
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 4,
      imageSize: 0.3,
    },
  };

  if (style.logo) {
    options.image = style.logo;
  }

  return new QRCodeStyling(options);
}

export async function generatePng(instance: QRCodeStyling): Promise<Blob | null> {
  return instance.getRawData('png');
}

export async function generateSvg(instance: QRCodeStyling): Promise<Blob | null> {
  return instance.getRawData('svg');
}

export async function downloadQr(instance: QRCodeStyling, format: 'png' | 'svg', hostname: string): Promise<void> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `qr-${hostname}-${date}.${format}`;

  const blob = await instance.getRawData(format);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(instance: QRCodeStyling): Promise<boolean> {
  try {
    const blob = await instance.getRawData('png');
    if (!blob) return false;
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function computeContrastRatio(fg: string, bg: string): number {
  const lum1 = relativeLuminance(fg);
  const lum2 = relativeLuminance(bg);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): number[] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function getContrastWarning(fg: string, bg: string): string | null {
  const ratio = computeContrastRatio(fg, bg);
  if (ratio < 4.5) {
    return `Contrast ratio ${ratio.toFixed(1)}:1 is below 4.5:1. QR may not scan reliably.`;
  }
  // Check for light-on-dark (inverted)
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  if (fgLum > bgLum) {
    return 'Light-on-dark QR codes often fail to scan. Consider inverting colors.';
  }
  return null;
}
