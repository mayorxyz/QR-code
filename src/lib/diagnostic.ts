import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { renderTileCanvas } from './styledExport';
import { computeContrastRatio } from './qr';

interface DiagnosticResult {
  test: string;
  pass: boolean;
  decoded: string | null;
  details?: string;
}

export async function runDiagnostic() {
  const results: DiagnosticResult[] = [];
  const shortUrl = 'https://example.com';
  const longUrl = 'https://example.com/' + 'a'.repeat(100);
  
  // Current style settings (round dots, green)
  const fgColor = '#008000'; // green
  const bgColor = '#FFFFFF'; // white
  
  console.log('=== QR TILE EXPORT DIAGNOSTIC ===\n');
  console.log('Style settings:');
  console.log('  Foreground:', fgColor);
  console.log('  Background:', bgColor);
  console.log('  Contrast ratio:', computeContrastRatio(fgColor, bgColor).toFixed(2));
  console.log('  Dot style: rounded');
  console.log('');

  for (const [urlName, url] of [['Short URL', shortUrl], ['Long URL (100 chars)', longUrl]] as const) {
    console.log(`\n--- Testing: ${urlName} ---`);
    console.log(`Payload: ${url.substring(0, 50)}${url.length > 50 ? '...' : ''}`);
    
    // Generate plain QR at native size (1024px)
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, url, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 1024,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    });
    
    const moduleSize = qrCanvas.width / (getQRSize(url) + 8); // +8 for quiet zone
    console.log(`  QR canvas size: ${qrCanvas.width}x${qrCanvas.height}`);
    console.log(`  Module size: ${moduleSize.toFixed(2)}px`);
    
    // Test A: Plain QR at native size
    const testA = await testWithJsQR(qrCanvas, url, 'A: Plain QR (native 1024px)');
    results.push(testA);
    
    // Test B: Plain QR downscaled to 800px
    const qr800 = downscaleCanvas(qrCanvas, 800);
    const testB = await testWithJsQR(qr800, url, 'B: Plain QR (downscaled 800px)');
    results.push(testB);
    
    // Test C: Control - black-on-white square style
    const qrControl = document.createElement('canvas');
    await QRCode.toCanvas(qrControl, url, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 1024,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    const testC = await testWithJsQR(qrControl, url, 'C: Control (black-on-white square)');
    results.push(testC);
    
    // Test D: Full tile canvas
    const tileCanvas = renderTileCanvas(qrCanvas, 1600, false);
    
    // Wait for drawing to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const testD = await testWithJsQR(tileCanvas, url, 'D: Full tile canvas (1600px)');
    results.push(testD);
    
    // Test E: Cropped tile (QR + quiet zone only)
    const crop = cropToQRWithQuietZone(tileCanvas, 1600);
    const crop800 = downscaleCanvas(crop, 800);
    const testE = await testWithJsQR(crop800, url, 'E: Cropped tile (QR+quiet, 800px)');
    results.push(testE);
    
    // Test F: BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      
      const testF1 = await testWithBarcodeDetector(detector, tileCanvas, url, 'F1: BarcodeDetector (full tile)');
      results.push(testF1);
      
      const testF2 = await testWithBarcodeDetector(detector, crop800, url, 'F2: BarcodeDetector (cropped 800px)');
      results.push(testF2);
    } else {
      console.log('  BarcodeDetector not available');
    }
  }
  
  // Print summary table
  console.log('\n\n=== RESULTS SUMMARY ===\n');
  console.log('Test'.padEnd(40) + 'Pass'.padEnd(8) + 'Decoded');
  console.log('-'.repeat(100));
  
  for (const result of results) {
    const status = result.pass ? '✓ PASS' : '✗ FAIL';
    const decoded = result.decoded ? result.decoded.substring(0, 40) + '...' : 'null';
    console.log(
      result.test.padEnd(40) +
      status.padEnd(8) +
      decoded
    );
    if (result.details) {
      console.log('  Details:', result.details);
    }
  }
  
  return results;
}

async function testWithJsQR(
  canvas: HTMLCanvasElement,
  expectedPayload: string,
  testName: string
): Promise<DiagnosticResult> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { test: testName, pass: false, decoded: null, details: 'No context' };
  }
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  
  const pass = code?.data === expectedPayload;
  return {
    test: testName,
    pass,
    decoded: code?.data || null,
    details: pass ? undefined : `Expected: ${expectedPayload.substring(0, 30)}...`,
  };
}

async function testWithBarcodeDetector(
  detector: any,
  canvas: HTMLCanvasElement,
  expectedPayload: string,
  testName: string
): Promise<DiagnosticResult> {
  try {
    const barcodes = await detector.detect(canvas);
    const qrCode = barcodes.find((b: any) => b.format === 'qr_code');
    const pass = qrCode?.rawValue === expectedPayload;
    
    return {
      test: testName,
      pass,
      decoded: qrCode?.rawValue || null,
      details: pass ? undefined : `Found ${barcodes.length} codes`,
    };
  } catch (err) {
    return {
      test: testName,
      pass: false,
      decoded: null,
      details: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
    };
  }
}

function downscaleCanvas(source: HTMLCanvasElement, targetSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d')!;
  
  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetSize, targetSize);
  
  return canvas;
}

function cropToQRWithQuietZone(tileCanvas: HTMLCanvasElement, tileSize: number): HTMLCanvasElement {
  // Calculate QR position in tile
  const margin = tileSize * 0.12;
  const tileInnerSize = tileSize - margin * 2;
  const quietZone = tileInnerSize * 0.08;
  
  const qrX = margin + quietZone;
  const qrY = margin + quietZone;
  const qrSize = tileInnerSize - quietZone * 2;
  
  // Create crop canvas
  const crop = document.createElement('canvas');
  crop.width = qrSize;
  crop.height = qrSize;
  const ctx = crop.getContext('2d')!;
  
  // Draw white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, qrSize, qrSize);
  
  // Draw QR from tile
  ctx.drawImage(tileCanvas, qrX, qrY, qrSize, qrSize, 0, 0, qrSize, qrSize);
  
  return crop;
}

function getQRSize(payload: string): number {
  // Approximate QR version based on payload length
  // This is a rough estimate for diagnostic purposes
  const len = payload.length;
  if (len < 20) return 21;
  if (len < 50) return 25;
  if (len < 100) return 29;
  if (len < 200) return 33;
  return 37;
}
