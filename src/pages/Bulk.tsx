import { useState } from 'react';
import { Layers, Download, Loader2 } from 'lucide-react';
import { sanitize } from '../lib/sanitize';
import { normalizeUrl } from '../lib/normalizeUrl';
import { createQrInstance } from '../lib/qr';
import { DEFAULT_STYLE } from '../lib/history';

export function BulkPage() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Array<{ url: string; displayUrl: string; valid: boolean; error?: string }>>([]);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleProcess = () => {
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    const processed: Array<{ url: string; displayUrl: string; valid: boolean; error?: string }> = [];

    for (const line of lines) {
      const san = sanitize(line);
      if (!san.valid) {
        processed.push({ url: line, displayUrl: line, valid: false, error: san.error });
        continue;
      }
      const norm = normalizeUrl(san.url);
      if (seen.has(norm.canonical)) continue;
      seen.add(norm.canonical);
      processed.push({ url: norm.canonical, displayUrl: norm.displayUrl, valid: true });
    }

    setResults(processed);
  };

  const validCount = results.filter(r => r.valid).length;
  const uniqueCount = new Set(results.filter(r => r.valid).map(r => r.url)).size;

  const handleExportZip = async () => {
    setExporting(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const validUrls = results.filter(r => r.valid);

      for (let i = 0; i < validUrls.length; i++) {
        const entry = validUrls[i];
        const instance = createQrInstance(entry.url, DEFAULT_STYLE);
        const blob = await instance.getRawData('png');
        if (blob) {
          const hostname = new URL(entry.url).hostname.replace('www.', '').replace(/[^a-z0-9]/gi, '-');
          zip.file(`qr-${hostname}-${i + 1}.png`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-bulk-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="nb-h2 mb-2">
          Bulk QR Generator.
        </h1>
        <p className="nb-body" style={{ opacity: 0.7 }}>
          Paste up to 50 URLs, one per line. Duplicates are removed after normalization.
        </p>
      </div>

      {/* Input */}
      <div className="mb-6">
        <label htmlFor="bulk-input" className="nb-label block mb-2" style={{ color: 'var(--color-ink)' }}>
          URLs (one per line)
        </label>
        <textarea
          id="bulk-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="https://example.com&#10;https://facebook.com/page&#10;https://x.com/user"
          rows={10}
          className="w-full p-5 text-sm outline-none resize-y transition-all duration-150 nb-box"
          style={{
            color: 'var(--color-ink)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          aria-label="Paste URLs here"
        />
      </div>

      {/* Process button */}
      <button
        onClick={handleProcess}
        disabled={!input.trim() || processing}
        className="nb-btn-primary mb-8"
      >
        <Layers size={16} />
        Process URLs
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div
              className="nb-hl"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {results.length} pasted, {uniqueCount} unique
            </div>
            {uniqueCount > 0 && (
              <button
                onClick={handleExportZip}
                disabled={exporting}
                className="nb-btn-secondary !py-2 !px-4 !text-xs"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Export ZIP
              </button>
            )}
          </div>

          <div
            className="overflow-hidden"
            style={{
              backgroundColor: 'var(--color-paper)',
              border: '3px solid var(--color-ink)',
              borderRadius: '16px',
              boxShadow: '6px 6px 0 var(--color-ink)',
            }}
          >
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3 border-b-3 last:border-b-0"
                style={{ borderColor: 'var(--color-ink)', borderBottomWidth: i < results.length - 1 ? '2px' : '0', borderBottomStyle: 'solid', borderBottomColor: 'rgba(17,17,17,0.15)', backgroundColor: i % 2 === 0 ? 'var(--color-paper)' : 'var(--color-bg)' }}
              >
                <span className="text-xs w-6 text-right font-bold" style={{ color: 'var(--color-ink)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {i + 1}
                </span>
                <span
                  className="flex-1 text-xs truncate font-medium"
                  style={{ color: r.valid ? 'var(--color-ink)' : 'var(--color-orange)', fontFamily: "'JetBrains Mono', monospace" }}
                  title={r.displayUrl}
                >
                  {r.displayUrl}
                </span>
                {!r.valid && (
                  <span className="text-xs font-bold" style={{ color: 'var(--color-orange)' }}>{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
