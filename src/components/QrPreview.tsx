import { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import type { StyleSettings } from '../lib/history';
import { createQrInstance } from '../lib/qr';

interface QrPreviewProps {
  url: string;
  style: StyleSettings;
  onInstanceChange?: (instance: QRCodeStyling | null) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export function QrPreview({ url, style, onInstanceChange, onCanvasReady }: QrPreviewProps) {
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

    // Extract canvas after rendering
    setTimeout(() => {
      const canvas = containerRef.current?.querySelector('canvas');
      onCanvasReady?.(canvas || null);
    }, 100);

    return () => {
      onInstanceChange?.(null);
      onCanvasReady?.(null);
    };
  }, [url, style.foreground, style.background, style.dotStyle, style.cornerStyle, style.logo, style.size, style.errorCorrection]);

  let hostname = 'link';
  try {
    hostname = new URL(url).hostname.replace('www.', '');
  } catch {
    // ignore
  }

  return (
    <div className="flex flex-col items-center">
      {/* QR tile with neo-brutalist frame */}
      <div
        className="p-5 transition-all duration-200 ease-out"
        style={{
          backgroundColor: '#FFFFFF',
          border: '3px solid var(--color-ink)',
          borderRadius: '16px',
          boxShadow: '8px 8px 0 var(--color-ink)',
          opacity: rendered ? 1 : 0,
          transform: rendered ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        <div
          ref={containerRef}
          className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center"
          role="img"
          aria-label={`QR code for ${hostname}`}
        />
      </div>

      {/* Technical annotations as badge */}
      <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
        <span className="nb-badge" style={{ backgroundColor: 'var(--color-pink)', color: 'var(--color-ink)' }}>
          {style.size} × {style.size} px
        </span>
        <span className="nb-badge" style={{ backgroundColor: 'var(--color-pink)', color: 'var(--color-ink)' }}>
          EC: {style.errorCorrection}
        </span>
        <span className="nb-badge" style={{ backgroundColor: 'var(--color-pink)', color: 'var(--color-ink)' }}>
          {hostname}
        </span>
      </div>
    </div>
  );
}
