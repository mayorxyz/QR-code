import { useState } from 'react';
import { Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { StyledTemplate, AccentColor } from '../lib/styledExport';
import { generateStyledExport, verifyStyledExport } from '../lib/styledExport';

interface StyledExportPanelProps {
  qrCanvas: HTMLCanvasElement | null;
  payload: string;
  host: string;
  platform?: string;
}

export function StyledExportPanel({ qrCanvas, payload, host, platform }: StyledExportPanelProps) {
  const [template, setTemplate] = useState<StyledTemplate>('card');
  const [accent, setAccent] = useState<AccentColor>('pink');
  const [customText, setCustomText] = useState('Scan me.');
  const [showHost, setShowHost] = useState(true);
  const [showCredit, setShowCredit] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    if (!qrCanvas) return;
    
    setIsExporting(true);
    setError(null);
    setSuccess(false);

    try {
      const blob = await generateStyledExport(qrCanvas, {
        template,
        payload,
        host,
        platform,
        accent,
        customText: customText.slice(0, 24),
        showHost,
        showCredit,
      });

      // Verify the export
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to create canvas');

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });

      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      tempCtx.drawImage(img, 0, 0);

      const isValid = await verifyStyledExport(tempCanvas, payload);

      if (!isValid) {
        setError('Styled export failed the scan check. Use the plain download.');
        setIsExporting(false);
        return;
      }

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      a.href = url;
      a.download = `qr-styled-${template}-${host}-${date}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const templates: { value: StyledTemplate; label: string }[] = [
    { value: 'card', label: 'Card' },
    { value: 'sticker', label: 'Sticker' },
    { value: 'poster', label: 'Poster' },
    { value: 'badge', label: 'Badge' },
  ];

  const accents: { value: AccentColor; color: string }[] = [
    { value: 'orange', color: '#ff6b2b' },
    { value: 'pink', color: '#f472b6' },
    { value: 'lime', color: '#c6f432' },
    { value: 'teal', color: '#2dd4bf' },
    { value: 'purple', color: '#a78bfa' },
  ];

  return (
    <div className="nb-box p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-full">
      <div>
        <h3 className="nb-h3 mb-4 sm:mb-6 text-xl sm:text-2xl font-black">Styled Export</h3>
        
        {/* Responsive Grid Layout for Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column: Template & Custom Text */}
          <div className="space-y-4 sm:space-y-5">
            {/* Template picker */}
            <div>
              <label className="nb-label block mb-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
                Template
              </label>
              <div className="nb-segment grid grid-cols-2 sm:flex flex-wrap gap-1.5">
                {templates.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTemplate(t.value)}
                    className={`${template === t.value ? 'nb-active' : ''} py-2 px-3 text-xs sm:text-sm font-bold flex-1 text-center`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom text */}
            {(template === 'poster' || template === 'badge') && (
              <div>
                <label className="nb-label block mb-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  {template === 'poster' ? 'Heading' : 'Title'}
                </label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.slice(0, 24))}
                  maxLength={24}
                  className="nb-input w-full text-sm py-2 px-3"
                  placeholder={template === 'poster' ? 'Scan me.' : 'Title'}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs opacity-60 font-mono" style={{ color: 'var(--color-ink)' }}>
                    {customText.length}/24 characters
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Accent Color & Toggles */}
          <div className="space-y-4 sm:space-y-5">
            {/* Accent color */}
            <div>
              <label className="nb-label block mb-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {accents.map(a => (
                  <button
                    key={a.value}
                    onClick={() => setAccent(a.value)}
                    className={`nb-swatch transition-transform hover:scale-110 ${accent === a.value ? 'ring-2 ring-offset-2 ring-[var(--color-ink)]' : ''}`}
                    style={{ backgroundColor: a.color, width: '32px', height: '32px', borderRadius: '8px' }}
                    aria-label={`${a.value} accent`}
                  />
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showHost}
                  onChange={(e) => setShowHost(e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer rounded"
                  style={{ accentColor: 'var(--color-lime)' }}
                />
                <span className="text-xs sm:text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                  Show host
                </span>
              </label>
              
              {template === 'poster' && (
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCredit}
                    onChange={(e) => setShowCredit(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer rounded"
                    style={{ accentColor: 'var(--color-lime)' }}
                  />
                  <span className="text-xs sm:text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                    Show QRLink credit
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Export action bar / button spanning full width */}
        <div className="mt-6 pt-4 border-t border-[rgba(17,17,17,0.15)] space-y-3">
          <button
            onClick={handleExport}
            disabled={!qrCanvas || isExporting}
            className="nb-btn-primary w-full py-3.5 px-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin shrink-0" />
                <span>Checking scan safety...</span>
              </>
            ) : success ? (
              <>
                <Check size={18} className="shrink-0" />
                <span>Downloaded Successfully!</span>
              </>
            ) : (
              <>
                <Download size={18} className="shrink-0" />
                <span>Download Styled Export</span>
              </>
            )}
          </button>

          {/* Status messages */}
          {error && (
            <div className="nb-box p-3.5 sm:p-4 text-xs sm:text-sm" style={{ backgroundColor: 'var(--color-pink)' }}>
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="font-bold break-words">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}