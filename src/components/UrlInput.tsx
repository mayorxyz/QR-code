import { useRef, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  warning?: string;
}

export function UrlInput({ value, onChange, error, warning }: UrlInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="w-full">
      <label htmlFor="url-input" className="nb-label block mb-2 text-xs sm:text-sm" style={{ color: 'var(--color-ink)' }}>
        Enter URL
      </label>
      <div
        className="relative flex flex-nowrap items-center px-3 py-2"
        style={{
          backgroundColor: 'var(--color-paper)',
          border: `3px solid ${error ? 'var(--color-pink)' : 'var(--color-ink)'}`,
          borderRadius: '12px',
          boxShadow: '4px 4px 0 var(--color-ink)',
          minHeight: '60px',
        }}
      >
        <span
          className="select-none flex items-center shrink-0 mr-2"
          style={{
            color: 'var(--color-ink)',
            backgroundColor: 'var(--color-lime)',
            border: '2px solid var(--color-ink)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
        >
          https://
        </span>
        <input
          ref={inputRef}
          id="url-input"
          type="text"
          value={value.startsWith('https://') ? value.slice(8) : value.startsWith('http://') ? value.slice(7) : value}
          onChange={handleChange}
          placeholder="example.com/page"
          className="flex-1 min-w-0 bg-transparent py-2 px-2 text-sm sm:text-base outline-none focus:outline-none focus:ring-0 placeholder:opacity-40"
          style={{ color: 'var(--color-ink)', fontFamily: "'JetBrains Mono', monospace" }}
          aria-describedby="url-status"
          autoComplete="url"
          spellCheck={false}
        />
      </div>

      {/* Status messages */}
      <div id="url-status" aria-live="polite" className="mt-3 min-h-[20px]">
        {error && (
          <div
            className="flex items-start sm:items-center gap-2 text-xs sm:text-sm px-4 py-2.5 break-words"
            style={{
              backgroundColor: 'var(--color-pink)',
              color: 'var(--color-ink)',
              border: '3px solid var(--color-ink)',
              borderRadius: '10px',
              boxShadow: '3px 3px 0 var(--color-ink)',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5 sm:mt-0" />
            <span>{error}</span>
          </div>
        )}
        {!error && warning && (
          <div
            className="flex items-start sm:items-center gap-2 text-xs sm:text-sm px-4 py-2.5 break-words"
            style={{
              backgroundColor: 'var(--color-lime)',
              color: 'var(--color-ink)',
              border: '3px solid var(--color-ink)',
              borderRadius: '10px',
              boxShadow: '3px 3px 0 var(--color-ink)',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5 sm:mt-0" />
            <span>{warning}</span>
          </div>
        )}
        {!error && !warning && value && (
          <div
            className="flex items-start sm:items-center gap-2 text-xs sm:text-sm px-4 py-2.5 break-words"
            style={{
              backgroundColor: 'var(--color-teal)',
              color: 'var(--color-ink)',
              border: '3px solid var(--color-ink)',
              borderRadius: '10px',
              boxShadow: '3px 3px 0 var(--color-ink)',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            <CheckCircle size={14} className="shrink-0 mt-0.5 sm:mt-0" />
            <span>Valid URL</span>
          </div>
        )}
      </div>
    </div>
  );
}