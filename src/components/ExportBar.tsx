import { useState, useEffect } from 'react';
import { Download, Copy, Share2, FileImage, FileCode, AlertCircle } from 'lucide-react';
import type QRCodeStyling from 'qr-code-styling';
import { downloadQr } from '../lib/qr';
import { renderTileCanvas, verifyStyledExport } from '../lib/styledExport';

interface ExportBarProps {
  instance: QRCodeStyling | null;
  hostname: string;
  payload: string;
}

type Busy = null | 'png' | 'plain' | 'svg' | 'copy' | 'share';

const VERIFY_FAIL = "This style may not scan. Use 'Download plain PNG'.";

const btn =
  'min-h-[44px] w-full sm:w-auto !py-2 !px-4 !text-sm sm:!text-xs flex items-center justify-center gap-2';

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create image'))), 'image/png');
  });
}

export function ExportBar({ instance, hostname, payload }: ExportBarProps) {
  const [busy, setBusy] = useState<Busy>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transparent, setTransparent] = useState(() => {
    try {
      return localStorage.getItem('qrlink_transparent') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('qrlink_transparent', String(transparent));
    } catch {
      // ignore
    }
  }, [transparent]);

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const fileName = () => {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `qr-${hostname}-${date}.png`;
  };

  const getQrCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!instance) return null;
    const raw = await instance.getRawData('png');
    if (!raw) return null;
    const url = URL.createObjectURL(raw as Blob);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  // One place for: render tile -> verify -> retry once -> blob. Throws VERIFY_FAIL.
  const buildVerifiedTile = async (): Promise<Blob> => {
    const qr = await getQrCanvas();
    if (!qr) throw new Error('QR code not ready');

    let tile = renderTileCanvas(qr, 1600, transparent);
    let result = await verifyStyledExport(tile, payload);

    if (!result.verified) {
      const qr2 = await getQrCanvas();
      if (qr2) {
        const big = document.createElement('canvas');
        big.width = Math.round(qr2.width * 1.1);
        big.height = Math.round(qr2.height * 1.1);
        big.getContext('2d')!.drawImage(qr2, 0, 0, big.width, big.height);
        tile = renderTileCanvas(big, 1600, transparent);
        result = await verifyStyledExport(tile, payload);
      }
    }

    if (!result.verified) throw new Error(VERIFY_FAIL);
    return canvasToBlob(tile);
  };

  const handleDownload = async () => {
    if (!instance || busy) return;
    setBusy('png');
    setError(null);
    try {
      saveBlob(await buildVerifiedTile(), fileName());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPlain = async () => {
    if (!instance || busy) return;
    setBusy('plain');
    setError(null);
    try {
      await downloadQr(instance, 'png', hostname);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadSvg = async () => {
    if (!instance || busy) return;
    setBusy('svg');
    setError(null);
    try {
      await downloadQr(instance, 'svg', hostname);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    if (!instance || busy) return;
    setBusy('copy');
    setError(null);

    // Start building now and hand the promise to the clipboard inside the click,
    // so Safari keeps the user-gesture permission while the check runs.
    const tilePromise = buildVerifiedTile();
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': tilePromise })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof Error && err.message === VERIFY_FAIL) {
        setError(VERIFY_FAIL);
      } else {
        try {
          saveBlob(await tilePromise, fileName());
          setError("Copy isn't supported here, downloaded instead.");
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Copy failed');
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (!instance || !canShare || busy) return;
    setBusy('share');
    setError(null);
    try {
      const blob = await buildVerifiedTile();
      const file = new File([blob], `qr-${hostname}.png`, { type: 'image/png' });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        saveBlob(blob, fileName());
        setError("Sharing files isn't supported here, downloaded instead.");
        return;
      }
      await navigator.share({ files: [file], title: `QR Code for ${hostname}` });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const disabled = !instance || busy !== null;

  return (
    <div
      className="flex flex-col gap-3 p-3 sm:p-4"
      style={{
        backgroundColor: 'var(--color-paper)',
        border: '3px solid var(--color-ink)',
        borderRadius: '16px',
        boxShadow: '6px 6px 0 var(--color-ink)',
      }}
    >
      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          checked={transparent}
          onChange={(e) => setTransparent(e.target.checked)}
          className="w-5 h-5 cursor-pointer"
          style={{ accentColor: 'var(--color-lime)' }}
        />
        <span className="text-sm sm:text-xs font-medium">Transparent background</span>
      </label>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <button
          onClick={handleDownload}
          disabled={disabled}
          className={`nb-btn-primary ${btn}`}
          aria-label="Download as PNG with tile"
        >
          {busy === 'png' ? 'Checking...' : (
            <>
              <FileImage size={16} />
              Download PNG
            </>
          )}
        </button>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            onClick={handleCopy}
            disabled={disabled}
            className={`nb-btn-secondary ${btn}`}
            style={copied ? { backgroundColor: 'var(--color-lime)' } : {}}
            aria-label="Copy to clipboard"
          >
            <Copy size={16} />
            {copied ? 'Copied!' : busy === 'copy' ? 'Checking...' : 'Copy'}
          </button>

          {canShare && (
            <button
              onClick={handleShare}
              disabled={disabled}
              className={`nb-btn-secondary ${btn}`}
              aria-label="Share QR code"
            >
              <Share2 size={16} />
              {busy === 'share' ? 'Checking...' : 'Share'}
            </button>
          )}

          <button
            onClick={handleDownloadSvg}
            disabled={disabled}
            className={`nb-btn-secondary ${btn}`}
            aria-label="Download as SVG (plain)"
          >
            <FileCode size={16} />
            SVG (plain)
          </button>

          <button
            onClick={handleDownloadPlain}
            disabled={disabled}
            className={`nb-btn-secondary ${btn} ${canShare ? '' : 'col-span-2 sm:col-span-1'}`}
            aria-label="Download plain PNG without tile"
          >
            <Download size={16} />
            Plain PNG
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3"
          style={{
            backgroundColor: 'var(--color-pink)',
            border: '3px solid var(--color-ink)',
            borderRadius: '10px',
          }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm sm:text-xs font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}