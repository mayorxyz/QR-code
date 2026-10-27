import { useState } from 'react';
import { Download, Copy, Share2, FileImage, FileCode } from 'lucide-react';
import type QRCodeStyling from 'qr-code-styling';
import { downloadQr, copyToClipboard } from '../lib/qr';

interface ExportBarProps {
  instance: QRCodeStyling | null;
  hostname: string;
}

export function ExportBar({ instance, hostname }: ExportBarProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (format: 'png' | 'svg') => {
    if (!instance) return;
    setDownloading(true);
    await downloadQr(instance, format, hostname);
    setDownloading(false);
  };

  const handleCopy = async () => {
    if (!instance) return;
    const success = await copyToClipboard(instance);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!instance || !navigator.share) return;
    const blob = await instance.getRawData('png');
    if (!blob) return;
    const file = new File([blob], `qr-${hostname}.png`, { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: `QR Code for ${hostname}` });
    } catch {
      // User cancelled
    }
  };

  const disabled = !instance;

  return (
    <div
      className="flex flex-wrap items-center justify-center sm:justify-between gap-2.5 p-3 sm:p-4 w-full"
      style={{
        backgroundColor: 'var(--color-paper)',
        border: '3px solid var(--color-ink)',
        borderRadius: '16px',
        boxShadow: '4px 4px 0 var(--color-ink)',
      }}
    >
      <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
        <button
          onClick={() => handleDownload('png')}
          disabled={disabled || downloading}
          className="nb-btn-primary !py-2 !px-3 sm:!px-4 !text-xs flex-1 sm:flex-none justify-center"
          aria-label="Download as PNG"
        >
          <FileImage size={14} />
          PNG
        </button>

        <button
          onClick={() => handleDownload('svg')}
          disabled={disabled}
          className="nb-btn-secondary !py-2 !px-3 sm:!px-4 !text-xs flex-1 sm:flex-none justify-center"
          aria-label="Download as SVG"
        >
          <FileCode size={14} />
          SVG
        </button>

        <button
          onClick={handleCopy}
          disabled={disabled}
          className="nb-btn-secondary !py-2 !px-3 sm:!px-4 !text-xs flex-1 sm:flex-none justify-center transition-colors"
          style={copied ? { backgroundColor: 'var(--color-lime)' } : {}}
          aria-label="Copy to clipboard"
        >
          <Copy size={14} />
          {copied ? 'Copied!' : 'Copy'}
        </button>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            onClick={handleShare}
            disabled={disabled}
            className="nb-btn-secondary !py-2 !px-3 sm:!px-4 !text-xs flex-1 sm:flex-none justify-center"
            aria-label="Share QR code"
          >
            <Share2 size={14} />
            Share
          </button>
        )}
      </div>

      <div className="w-full sm:w-auto sm:ml-auto flex justify-center mt-1 sm:mt-0">
        <button
          onClick={() => handleDownload('png')}
          disabled={disabled}
          className="nb-btn-primary !py-2 !px-4 !text-xs w-full sm:w-auto justify-center"
          aria-label="Download QR code"
        >
          <Download size={14} />
          Download
        </button>
      </div>
    </div>
  );
}