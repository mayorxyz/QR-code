import { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import type { StyleSettings } from '../lib/history';
import { createQrInstance } from '../lib/qr';

interface QrPreviewProps {
  url: string;
  style: StyleSettings;
  onInstanceChange?: (instance: QRCodeStyling | null) => void;
}

export function QrPreview({ url, style, onInstanceChange }: QrPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<QRCodeStyling | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    const instance = createQrInstance(url, style);
    instanceRef.current = instance;
    onInstanceChange?.(instance);

    // Clear previous
    containerRef.current.innerHTML = '';

    // Render
    instance.append(containerRef.current);
    setRendered(true);

    return () => {
      onInstanceChange?.(null);
    };
  }, [url, style.foreground, style.background, style.dotStyle, style.cornerStyle, style.logo, style.size, style.errorCorrection]);

  let hostname = 'link';
  try {
    hostname = new URL(url).hostname.replace('www.', '');
  } catch {
    // ignore
  }

  return (
    <div className="flex flex-col items-center w-full max-w-full">
      {/* QR tile with neo-brutalist frame */}
      <div
        className="p-4 sm:p-5 transition-all duration-200 ease-out flex items-center justify-center max-w-full"
        style={{
          backgroundColor: '#FFFFFF',
          border: '3px solid var(--color-ink)',
          borderRadius: '16px',
          boxShadow: '6px 6px 0 var(--color-ink)',
          opacity: rendered ? 1 : 0,
          transform: rendered ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        <div
          ref={containerRef}
          className="w-48 h-48 sm:w-56 sm:h-56 max-w-full flex items-center justify-center overflow-hidden"
          role="img"
          aria-label={`QR code for ${hostname}`}
        />
      </div>

      {/* Technical annotations as badge */}
      <div className="mt-5 flex items-center gap-2 flex-wrap justify-center px-2">
        <span className="nb-badge text-xs px-2.5 py-1" style={{ backgroundColor: 'var(--color-pink)', color: 'var(--color-ink)' }}>
          {style.size} × {style.size} px
        </span>
        <span className="nb-badge text-xs px-2.5 py-1" style={{ backgroundColor: 'var(--color-pink)', color: 'var(--color-ink)' }}>
          EC: {style.errorCorrection}
        </span>
        <span className="nb-badge text-xs px-2.5 py-1 truncate max-w-[180px]" style={{ backgroundColor: 'var(--color-pink)', color: 'var(--color-ink)' }}>
          {hostname}
        </span>
      </div>
    </div>
  );
}