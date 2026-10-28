import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderTileCanvas } from './styledExport';
import jsQR from 'jsqr';

describe('renderTileCanvas', () => {
  let mockQrCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a mock QR canvas (21x21 modules, typical for short URLs)
    mockQrCanvas = document.createElement('canvas');
    mockQrCanvas.width = 210;
    mockQrCanvas.height = 210;
    const ctx = mockQrCanvas.getContext('2d')!;
    
    // Draw a simple QR-like pattern
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 210, 210);
    ctx.fillStyle = '#000000';
    
    // Draw finder patterns (simplified)
    const moduleSize = 10;
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
        }
      }
    }
  });

  it('should create a 1600x1600 canvas by default', async () => {
    const tileCanvas = await renderTileCanvas(mockQrCanvas);
    expect(tileCanvas.width).toBe(1600);
    expect(tileCanvas.height).toBe(1600);
  });

  it('should create a canvas with custom size', async () => {
    const tileCanvas = renderTileCanvas(mockQrCanvas, 800, false);
    expect(tileCanvas.width).toBe(800);
    expect(tileCanvas.height).toBe(800);
  });

  it('should have cream background by default', async () => {
    const tileCanvas = renderTileCanvas(mockQrCanvas);
    const ctx = tileCanvas.getContext('2d')!;
    
    // Check corner pixel (should be cream)
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    expect(pixel[0]).toBe(253); // R
    expect(pixel[1]).toBe(243); // G
    expect(pixel[2]).toBe(223); // B
  });

  it('should have transparent background when option is set', async () => {
    const tileCanvas = renderTileCanvas(mockQrCanvas, 1600, true);
    const ctx = tileCanvas.getContext('2d')!;
    
    // Check corner pixel (should be transparent)
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    expect(pixel[3]).toBe(0); // Alpha should be 0
  });

  it('should draw a white tile in the center', async () => {
    const tileCanvas = renderTileCanvas(mockQrCanvas);
    const ctx = tileCanvas.getContext('2d')!;
    
    // Check center of tile (should be white)
    const centerX = 800;
    const centerY = 800;
    const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
    expect(pixel[0]).toBe(255); // R
    expect(pixel[1]).toBe(255); // G
    expect(pixel[2]).toBe(255); // B
  });

  it('should draw a black border around the tile', async () => {
    const tileCanvas = renderTileCanvas(mockQrCanvas);
    const ctx = tileCanvas.getContext('2d')!;
    
    // Check edge of tile (should have black border)
    // New geometry: T = 0.76 * 1600 = 1216, x = (1600 - (1216 + 48)) / 2 = 168
    const T = 0.76 * 1600;
    const off = 0.03 * 1600;
    const x = (1600 - (T + off)) / 2;
    const bw = 0.009 * 1600;
    const edgeX = x + bw / 2;
    const edgeY = 800;
    const pixel = ctx.getImageData(edgeX, edgeY, 1, 1).data;
    expect(pixel[0]).toBe(17); // R (close to #111)
    expect(pixel[1]).toBe(17); // G
    expect(pixel[2]).toBe(17); // B
  });

  it('should draw a shadow offset down-right', async () => {
    const tileCanvas = renderTileCanvas(mockQrCanvas);
    const ctx = tileCanvas.getContext('2d')!;
    
    // Check shadow area (bottom-right of tile)
    const T = 0.76 * 1600;
    const off = 0.03 * 1600;
    const x = (1600 - (T + off)) / 2;
    const shadowX = x + off + T / 2;
    const shadowY = x + off + T / 2;
    
    const pixel = ctx.getImageData(shadowX, shadowY, 1, 1).data;
    expect(pixel[0]).toBe(17); // R (shadow color)
    expect(pixel[1]).toBe(17); // G
    expect(pixel[2]).toBe(17); // B
  });

  it('should draw QR code inside the tile', async () => {
    const tileCanvas = renderTileCanvas(mockQrCanvas);
    const ctx = tileCanvas.getContext('2d')!;
    
    // Check that QR is drawn (should have black modules)
    const T = 0.76 * 1600;
    const off = 0.03 * 1600;
    const x = (1600 - (T + off)) / 2;
    const P = 0.09 * T;
    const qrX = x + P + 50;
    const qrY = x + P + 50;
    
    const pixel = ctx.getImageData(qrX, qrY, 1, 1).data;
    // Should be either black (QR module) or white (QR background)
    const isBlack = pixel[0] < 50 && pixel[1] < 50 && pixel[2] < 50;
    const isWhite = pixel[0] > 200 && pixel[1] > 200 && pixel[2] > 200;
    expect(isBlack || isWhite).toBe(true);
  });
});

describe('Tile verification with jsQR', () => {
  it('should verify a simple QR code in tile', async () => {
    // Create a real QR code using qrcode library
    const QRCode = await import('qrcode');
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, 'https://example.com', {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    });
    
    // Render tile
    const tileCanvas = renderTileCanvas(qrCanvas);
    
    // Verify with jsQR
    const ctx = tileCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, tileCanvas.width, tileCanvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    
    expect(code).not.toBeNull();
    expect(code?.data).toBe('https://example.com');
  });

  it('should verify a WiFi payload in tile', async () => {
    const QRCode = await import('qrcode');
    const qrCanvas = document.createElement('canvas');
    const wifiPayload = 'WIFI:T:WPA;S:MyNetwork;P:MyPassword;;';
    
    await QRCode.toCanvas(qrCanvas, wifiPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    });
    
    const tileCanvas = renderTileCanvas(qrCanvas);
    const ctx = tileCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, tileCanvas.width, tileCanvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    
    expect(code).not.toBeNull();
    expect(code?.data).toBe(wifiPayload);
  });

  it('should verify a long URL in tile', async () => {
    const QRCode = await import('qrcode');
    const qrCanvas = document.createElement('canvas');
    const longUrl = 'https://example.com/' + 'a'.repeat(300);
    
    await QRCode.toCanvas(qrCanvas, longUrl, {
      errorCorrectionLevel: 'L',
      margin: 2,
      width: 512,
    });
    
    const tileCanvas = renderTileCanvas(qrCanvas);
    const ctx = tileCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, tileCanvas.width, tileCanvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    
    expect(code).not.toBeNull();
    expect(code?.data).toBe(longUrl);
  });
});
