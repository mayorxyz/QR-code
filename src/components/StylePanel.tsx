import { useRef } from 'react';
import type { StyleSettings } from '../lib/history';

interface StylePanelProps {
  style: StyleSettings;
  onChange: (style: StyleSettings) => void;
  contrastWarning: string | null;
}

const DOT_STYLES: Array<{ value: StyleSettings['dotStyle']; label: string }> = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
];

const CORNER_STYLES: Array<{ value: StyleSettings['cornerStyle']; label: string }> = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dot', label: 'Dot' },
];

const EC_LEVELS: Array<{ value: StyleSettings['errorCorrection']; label: string }> = [
  { value: 'L', label: 'L (7%)' },
  { value: 'M', label: 'M (15%)' },
  { value: 'Q', label: 'Q (25%)' },
  { value: 'H', label: 'H (30%)' },
];

export function StylePanel({ style, onChange, contrastWarning }: StylePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      alert('Logo must be under 200 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onChange({
        ...style,
        logo: dataUrl,
        errorCorrection: 'H', // Auto-switch to H when logo is added
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="p-4 sm:p-6 space-y-4 sm:space-y-5"
      style={{
        backgroundColor: 'var(--color-paper)',
        border: '3px solid var(--color-ink)',
        borderRadius: '16px',
        boxShadow: '6px 6px 0 var(--color-ink)',
      }}
    >
      <h3 className="nb-label" style={{ color: 'var(--color-ink)' }}>
        Style
      </h3>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Foreground</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={style.foreground}
              onChange={e => onChange({ ...style, foreground: e.target.value })}
              className="w-9 h-9 cursor-pointer"
              aria-label="Foreground color"
            />
            <span className="text-xs" style={{ color: 'var(--color-ink)', fontFamily: "'JetBrains Mono', monospace" }}>
              {style.foreground}
            </span>
          </div>
        </div>
        <div>
          <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Background</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={style.background}
              onChange={e => onChange({ ...style, background: e.target.value })}
              className="w-9 h-9 cursor-pointer"
              aria-label="Background color"
            />
            <span className="text-xs" style={{ color: 'var(--color-ink)', fontFamily: "'JetBrains Mono', monospace" }}>
              {style.background}
            </span>
          </div>
        </div>
      </div>

      {/* Contrast warning */}
      {contrastWarning && (
        <div
          className="text-xs px-4 py-3 font-medium"
          style={{
            backgroundColor: 'var(--color-orange)',
            color: 'var(--color-ink)',
            border: '3px solid var(--color-ink)',
            borderRadius: '10px',
            boxShadow: '3px 3px 0 var(--color-ink)',
          }}
        >
          {contrastWarning}
        </div>
      )}

      {/* Dot style */}
      <div>
        <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Dot Style</label>
        <div className="nb-segment">
          {DOT_STYLES.map(ds => (
            <button
              key={ds.value}
              onClick={() => onChange({ ...style, dotStyle: ds.value })}
              className={style.dotStyle === ds.value ? 'nb-active' : ''}
            >
              {ds.label}
            </button>
          ))}
        </div>
      </div>

      {/* Corner style */}
      <div>
        <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Corner Style</label>
        <div className="nb-segment">
          {CORNER_STYLES.map(cs => (
            <button
              key={cs.value}
              onClick={() => onChange({ ...style, cornerStyle: cs.value })}
              className={style.cornerStyle === cs.value ? 'nb-active' : ''}
            >
              {cs.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error correction */}
      <div>
        <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Error Correction</label>
        <div className="nb-segment">
          {EC_LEVELS.map(ec => (
            <button
              key={ec.value}
              onClick={() => onChange({ ...style, errorCorrection: ec.value })}
              className={style.errorCorrection === ec.value ? 'nb-active' : ''}
            >
              {ec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logo upload */}
      <div>
        <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Center Logo (optional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
          aria-label="Upload center logo"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="nb-btn-secondary !py-2 !px-4 !text-xs"
          >
            {style.logo ? 'Change Logo' : 'Upload Logo'}
          </button>
          {style.logo && (
            <button
              onClick={() => onChange({ ...style, logo: null, errorCorrection: 'M' })}
              className="nb-btn-secondary !py-2 !px-4 !text-xs"
              style={{ backgroundColor: 'var(--color-pink)' }}
            >
              Remove
            </button>
          )}
        </div>
        {style.logo && (
          <p className="text-xs mt-2 font-medium" style={{ color: 'var(--color-ink)' }}>
            Error correction auto-set to H for logo overlay.
          </p>
        )}
      </div>

      {/* Size */}
      <div>
        <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Export Size</label>
        <div className="nb-segment">
          {[1024, 2048].map(size => (
            <button
              key={size}
              onClick={() => onChange({ ...style, size })}
              className={style.size === size ? 'nb-active' : ''}
            >
              {size}px
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
