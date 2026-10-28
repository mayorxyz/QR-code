import { useState } from 'react';
import { Trash2, Search, QrCode, ExternalLink } from 'lucide-react';
import type { HistoryEntry } from '../lib/history';
import { createQrInstance } from '../lib/qr';
import { useEffect, useRef } from 'react';

interface HistoryGridProps {
  entries: HistoryEntry[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onReopen: (entry: HistoryEntry) => void;
}

function HistoryItem({ entry, onRemove, onReopen }: { entry: HistoryEntry; onRemove: (id: string) => void; onReopen: (entry: HistoryEntry) => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.innerHTML = '';
    const instance = createQrInstance(entry.url, {
      ...entry.style,
      size: 128,
    });
    instance.append(canvasRef.current);
  }, [entry.url, entry.id]);

  return (
    <div
      className="nb-history-card p-4 group transition-all duration-150"
      style={{
        backgroundColor: 'var(--color-paper)',
        border: '3px solid var(--color-ink)',
        borderRadius: '16px',
        boxShadow: '6px 6px 0 var(--color-ink)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-16 h-16 flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            border: '3px solid var(--color-ink)',
            borderRadius: '8px',
          }}
        >
          <div ref={canvasRef} className="w-14 h-14" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs truncate font-medium"
            style={{ color: 'var(--color-ink)', fontFamily: "'JetBrains Mono', monospace" }}
            title={entry.displayUrl || entry.url}
          >
            {entry.displayUrl || entry.url}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {entry.type && entry.type !== 'url' && (
              <span className="nb-badge !text-[10px] !py-0 !px-2" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>
                {entry.type}
              </span>
            )}
            <span className="text-xs" style={{ color: 'var(--color-ink)', opacity: 0.6 }}>
              {entry.platform} · {new Date(entry.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onReopen(entry)}
              className="p-2 transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-paper)',
                border: '2px solid var(--color-ink)',
                borderRadius: '6px',
                color: 'var(--color-ink)',
              }}
              aria-label="Re-open this URL"
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={() => onRemove(entry.id)}
              className="p-2 transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-paper)',
                border: '2px solid var(--color-ink)',
                borderRadius: '6px',
                color: 'var(--color-ink)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-orange)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-paper)';
                e.currentTarget.style.color = 'var(--color-ink)';
              }}
              aria-label="Delete this entry"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HistoryGrid({ entries, onRemove, onClearAll, onReopen }: HistoryGridProps) {
  const [search, setSearch] = useState('');

  const filtered = entries.filter(e =>
    (e.displayUrl || e.url).toLowerCase().includes(search.toLowerCase()) ||
    e.platform.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Search and controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-10 pr-4 py-3 text-sm outline-none transition-all duration-150"
            style={{
              backgroundColor: 'var(--color-paper)',
              border: '3px solid var(--color-ink)',
              borderRadius: '12px',
              boxShadow: '4px 4px 0 var(--color-ink)',
              color: 'var(--color-ink)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
            aria-label="Search history"
          />
        </div>
        {entries.length > 0 && (
          <button
            onClick={onClearAll}
            className="nb-btn-secondary !py-3 !px-4 !text-xs"
            style={{ backgroundColor: 'var(--color-pink)' }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <QrCode size={32} className="mx-auto mb-3" style={{ color: 'var(--color-ink)', opacity: 0.4 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)', opacity: 0.6 }}>
            {search ? 'No matching entries.' : 'No history yet. Generate a QR code to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(entry => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onRemove={onRemove}
              onReopen={onReopen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
