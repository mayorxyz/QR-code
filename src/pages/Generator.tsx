import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import QRCodeStyling from 'qr-code-styling';
import { UrlInput } from '../components/UrlInput';
import { QrPreview } from '../components/QrPreview';
import { StylePanel } from '../components/StylePanel';
import { ExportBar } from '../components/ExportBar';
import { PlatformChip } from '../components/PlatformChip';
import { PayloadTabs } from '../components/PayloadTabs';
import { PayloadForm } from '../components/PayloadForm';
import { sanitize } from '../lib/sanitize';
import { normalizeUrl } from '../lib/normalizeUrl';
import { classifyPlatform } from '../lib/platforms';
import { sha256 } from '../lib/hash';
import { getContrastWarning } from '../lib/qr';
import { getPayloadType } from '../lib/payloads';
import { DEFAULT_STYLE, loadHistory, saveHistory, addEntry, loadSettings, saveSettings } from '../lib/history';
import type { StyleSettings, HistoryEntry } from '../lib/history';
import { Undo2, Info } from 'lucide-react';

// localStorage keys
const LAST_TAB_KEY = 'qrlink_last_tab';
const FIELD_VALUES_KEY = 'qrlink_field_values';

function loadLastTab(): string {
  try {
    return localStorage.getItem(LAST_TAB_KEY) || 'url';
  } catch {
    return 'url';
  }
}

function saveLastTab(tab: string): void {
  try {
    localStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    // ignore
  }
}

function loadFieldValues(): Record<string, Record<string, string | boolean>> {
  try {
    const raw = localStorage.getItem(FIELD_VALUES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFieldValues(values: Record<string, Record<string, string | boolean>>): void {
  try {
    localStorage.setItem(FIELD_VALUES_KEY, JSON.stringify(values));
  } catch {
    // ignore
  }
}

export function GeneratorPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Determine initial tab from URL param or localStorage
  const urlType = searchParams.get('type');
  const [activeType, setActiveType] = useState<string>(urlType || loadLastTab());
  
  // Handle restoration from history
  useEffect(() => {
    const state = location.state as { restoreType?: string; restoreFieldValues?: Record<string, string | boolean> } | null;
    if (state?.restoreType) {
      setActiveType(state.restoreType);
      if (state.restoreFieldValues) {
        setAllFieldValues(prev => ({
          ...prev,
          [state.restoreType!]: state.restoreFieldValues!
        }));
      }
      // Clear the navigation state
      window.history.replaceState({}, '');
    }
  }, [location.state]);
  
  // Field values per type
  const [allFieldValues, setAllFieldValues] = useState<Record<string, Record<string, string | boolean>>>(loadFieldValues());
  const currentFieldValues = allFieldValues[activeType] || {};
  
  // URL-specific state (kept for backward compatibility)
  const [rawInput, setRawInput] = useState('');
  const [sanitizedUrl, setSanitizedUrl] = useState('');
  const [sanitizeError, setSanitizeError] = useState<string | undefined>();
  const [sanitizeWarning, setSanitizeWarning] = useState<string | undefined>();
  const [normalized, setNormalized] = useState<{ canonical: string; displayUrl: string; changed: boolean; removedParams: string[] } | null>(null);
  const [useOriginal, setUseOriginal] = useState(false);
  const [platform, setPlatform] = useState<{ name: string; icon: string; note?: string } | null>(null);
  
  // Shared state
  const [style, setStyle] = useState<StyleSettings>(DEFAULT_STYLE);
  const [qrInstance, setQrInstance] = useState<QRCodeStyling | null>(null);
  const [duplicateFlash, setDuplicateFlash] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedPayload, setDebouncedPayload] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // Validation state for non-URL types
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationHints, setValidationHints] = useState<Record<string, string>>({});
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Load history and settings on mount
  useEffect(() => {
    setHistory(loadHistory());
    setStyle(loadSettings());
  }, []);

  // Save settings on change
  useEffect(() => {
    saveSettings(style);
  }, [style]);

  // Save last tab on change
  useEffect(() => {
    saveLastTab(activeType);
  }, [activeType]);

  // Save field values on change
  useEffect(() => {
    saveFieldValues(allFieldValues);
  }, [allFieldValues]);

  // Handle tab change
  const handleTabChange = (typeId: string) => {
    setActiveType(typeId);
    setValidationErrors({});
    setValidationHints({});
    setValidationWarnings([]);
  };

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: string | boolean) => {
    setAllFieldValues(prev => ({
      ...prev,
      [activeType]: {
        ...prev[activeType],
        [fieldId]: value
      }
    }));
  };

  // URL-specific pipeline (only for URL type)
  useEffect(() => {
    if (activeType !== 'url') {
      setSanitizedUrl('');
      setSanitizeError(undefined);
      setSanitizeWarning(undefined);
      setNormalized(null);
      setPlatform(null);
      return;
    }

    if (!rawInput.trim()) {
      setSanitizedUrl('');
      setSanitizeError(undefined);
      setSanitizeWarning(undefined);
      setNormalized(null);
      setPlatform(null);
      return;
    }

    const result = sanitize(rawInput);
    if (!result.valid) {
      setSanitizedUrl('');
      setSanitizeError(result.error);
      setSanitizeWarning(undefined);
      setNormalized(null);
      setPlatform(null);
      return;
    }

    setSanitizeError(undefined);
    setSanitizeWarning(result.warning);
    setSanitizedUrl(result.url);

    const norm = normalizeUrl(result.url);
    setNormalized(norm);

    const plat = classifyPlatform(result.url);
    setPlatform(plat);
  }, [rawInput, activeType]);

  // Non-URL type validation and payload building
  useEffect(() => {
    if (activeType === 'url') return;

    const payloadType = getPayloadType(activeType);
    if (!payloadType) return;

    const result = payloadType.validate(currentFieldValues);
    setValidationErrors(result.errors);
    setValidationHints(result.hints || {});
    setValidationWarnings(result.warnings || []);
  }, [activeType, currentFieldValues]);

  // Build the final payload
  const getPayload = (): string => {
    if (activeType === 'url') {
      return useOriginal ? sanitizedUrl : (normalized?.canonical || sanitizedUrl);
    }

    const payloadType = getPayloadType(activeType);
    if (!payloadType) return '';

    const result = payloadType.validate(currentFieldValues);
    if (!result.ok) return '';

    return payloadType.build(currentFieldValues);
  };

  const payload = getPayload();

  // Debounce payload for QR generation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedPayload(payload);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [payload]);

  // Save to history when payload changes
  const savedRef = useRef('');
  useEffect(() => {
    if (!payload) return;

    const saveToHistory = async () => {
      const styleKey = JSON.stringify({ fg: style.foreground, bg: style.background, dot: style.dotStyle, corner: style.cornerStyle, logo: !!style.logo });
      const hashInput = activeType + payload + styleKey;
      const id = await sha256(hashInput);

      if (savedRef.current === id) return;
      savedRef.current = id;

      let displayUrl = payload;
      let platformName = 'Generic';

      if (activeType === 'url' && normalized) {
        displayUrl = normalized.displayUrl;
        platformName = platform?.name || 'Generic';
      } else {
        const payloadType = getPayloadType(activeType);
        platformName = payloadType?.label || 'Generic';
      }

      const entry: HistoryEntry = {
        id,
        url: payload,
        displayUrl,
        platform: platformName,
        createdAt: Date.now(),
        style: { ...style },
        type: activeType,
        fieldValues: activeType === 'url' ? undefined : { ...currentFieldValues }
      };

      const { entries, duplicate } = addEntry(entry, history);
      setHistory(entries);
      saveHistory(entries);

      if (duplicate) {
        setDuplicateFlash(true);
        setTimeout(() => setDuplicateFlash(false), 2000);
      }
    };

    saveToHistory();
  }, [payload, activeType, normalized, style, platform, history, currentFieldValues]);

  const contrastWarning = getContrastWarning(style.foreground, style.background);

  let hostname = 'link';
  try {
    hostname = new URL(payload || 'https://link').hostname.replace('www.', '');
  } catch { /* ignore */ }

  // Determine if we should show the QR
  const shouldShowQR = activeType === 'url' 
    ? (sanitizedUrl && !sanitizeError)
    : (payload && Object.keys(validationErrors).length === 0);

  // Get warnings for display
  const displayWarnings = activeType === 'url' 
    ? (sanitizeWarning ? [sanitizeWarning] : [])
    : validationWarnings;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 w-full overflow-x-hidden">
      {/* Hero section */}
      <div className="grid grid-cols-1 gap-6 mb-6 sm:mb-10 w-full">
        <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
          {/* Hero text + input */}
          <div className="flex-1 min-w-0 w-full">
            <h1 className="nb-h1 mb-2 sm:mb-4 text-2xl sm:text-5xl leading-tight">
              Paste a link.{' '}
              <br className="hidden sm:inline" />
              Get a{' '}
              <span className="nb-hl inline-block sm:-translate-y-0.5">
                QR code.
              </span>
            </h1>
            <p className="nb-body mb-4 sm:mb-8 text-xs sm:text-base" style={{ opacity: 0.7 }}>
              Free, instant, and 100% private. Nothing leaves your browser.
            </p>

            {/* Duplicate flash */}
            {duplicateFlash && (
              <div
                className="mb-3 px-3 py-2 text-xs sm:text-sm font-bold animate-bounce"
                style={{
                  backgroundColor: 'var(--color-lime)',
                  color: 'var(--color-ink)',
                  border: '3px solid var(--color-ink)',
                  borderRadius: '10px',
                  boxShadow: '3px 3px 0 var(--color-ink)',
                }}
              >
                Already in history — moved to top.
              </div>
            )}

            {/* Input inside hero box */}
            <div
              className="p-3 sm:p-6 w-full"
              style={{
                backgroundColor: 'var(--color-paper)',
                border: '3px solid var(--color-ink)',
                borderRadius: '16px',
                boxShadow: '4px 4px 0 var(--color-ink)',
              }}
            >
              {/* Tab row */}
              <div className="mb-4 sm:mb-6 overflow-x-auto pb-1 scrollbar-none">
                <PayloadTabs activeType={activeType} onChange={handleTabChange} />
              </div>

              {/* URL input (only for URL type) */}
              {activeType === 'url' && (
                <UrlInput
                  value={rawInput}
                  onChange={setRawInput}
                  error={sanitizeError}
                  warning={sanitizeWarning}
                />
              )}

              {/* Form for other types */}
              {activeType !== 'url' && (() => {
                const payloadType = getPayloadType(activeType);
                if (!payloadType) return null;
                return (
                  <PayloadForm
                    type={payloadType}
                    values={currentFieldValues}
                    errors={validationErrors}
                    hints={validationHints}
                    onChange={handleFieldChange}
                  />
                );
              })()}
            </div>
          </div>

          {/* Decorative stage (≥1024px) */}
          <div
            className="nb-hero-stage hidden lg:flex flex-col items-center justify-center gap-4 p-6 relative"
            style={{
              width: '340px',
              minHeight: '400px',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {/* c1 - teal card */}
            <div
              className="nb-bob w-full p-5 relative"
              style={{
                backgroundColor: 'var(--color-teal)',
                border: '3px solid var(--color-ink)',
                borderRadius: '16px',
                boxShadow: '6px 6px 0 var(--color-ink)',
              }}
            >
              <div className="flex gap-2">
                <div className="h-3 rounded-full flex-1" style={{ backgroundColor: 'var(--color-lime)', border: '2px solid var(--color-ink)' }} />
                <div className="h-3 rounded-full w-16" style={{ backgroundColor: 'var(--color-pink)', border: '2px solid var(--color-ink)' }} />
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-3 rounded-full w-20" style={{ backgroundColor: 'var(--color-lime)', border: '2px solid var(--color-ink)' }} />
                <div className="h-3 rounded-full flex-1" style={{ backgroundColor: 'var(--color-pink)', border: '2px solid var(--color-ink)' }} />
              </div>
            </div>

            {/* c2 - paper card with checker pattern */}
            <div
              className="nb-bob-delay w-full p-5 relative"
              style={{
                backgroundColor: 'var(--color-paper)',
                border: '3px solid var(--color-ink)',
                borderRadius: '16px',
                boxShadow: '6px 6px 0 var(--color-ink)',
              }}
            >
              {/* Checker QR block */}
              <div className="grid grid-cols-5 gap-0.5 mb-3">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-sm"
                    style={{
                      backgroundColor: (i + Math.floor(i / 5)) % 2 === 0 ? 'var(--color-ink)' : 'transparent',
                      border: (i + Math.floor(i / 5)) % 2 === 0 ? '1px solid var(--color-ink)' : '1px solid rgba(17,17,17,0.15)',
                    }}
                  />
                ))}
              </div>
              <div className="h-4 rounded" style={{ backgroundColor: 'var(--color-pink)', border: '2px solid var(--color-ink)' }} />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="nb-tag nb-platform-facebook" style={{ fontSize: '0.7rem' }}>Facebook</span>
              <span className="nb-tag nb-platform-x" style={{ fontSize: '0.7rem' }}>X</span>
              <span className="nb-tag nb-platform-claude" style={{ fontSize: '0.7rem' }}>Claude</span>
              <span className="nb-tag" style={{ backgroundColor: 'var(--color-orange)', color: '#fff', fontSize: '0.7rem' }}>Scanned!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cleaned link row (URL type only) */}
      {activeType === 'url' && normalized && normalized.changed && !useOriginal && (
        <div
          className="mb-4 px-3 sm:px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full"
          style={{
            backgroundColor: 'var(--color-teal)',
            border: '3px solid var(--color-ink)',
            borderRadius: '14px',
            boxShadow: '4px 4px 0 var(--color-ink)',
          }}
        >
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <p className="nb-label mb-0.5 text-xs" style={{ color: 'var(--color-ink)' }}>
              Cleaned link
            </p>
            <p className="text-xs truncate font-medium" style={{ color: 'var(--color-ink)', fontFamily: "'JetBrains Mono', monospace" }}>
              {normalized.displayUrl}
            </p>
            {normalized.removedParams.length > 0 && (
              <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--color-ink)', opacity: 0.7 }}>
                Removed: {normalized.removedParams.join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={() => setUseOriginal(true)}
            className="nb-btn-secondary !py-1.5 !px-3 !text-xs whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <Undo2 size={12} />
            Use original
          </button>
        </div>
      )}

      {activeType === 'url' && useOriginal && (
        <button
          onClick={() => setUseOriginal(false)}
          className="mb-3 flex items-center gap-1.5 text-xs font-bold transition-colors duration-150"
          style={{ color: 'var(--color-ink)' }}
        >
          <Undo2 size={12} />
          Using original URL — switch back to cleaned
        </button>
      )}

      {/* Platform chip (URL type only) */}
      {activeType === 'url' && platform && sanitizedUrl && (
        <div className="mb-4">
          <PlatformChip name={platform.name} icon={platform.icon} note={platform.note} />
        </div>
      )}

      {/* Type badge for non-URL types */}
      {activeType !== 'url' && payload && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="nb-badge text-xs px-2 py-0.5" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>
            {getPayloadType(activeType)?.label}
          </span>
          <span className="nb-badge text-xs px-2 py-0.5" style={{ backgroundColor: 'var(--color-pink)', color: 'var(--color-ink)' }}>
            {payload.length} chars
          </span>
        </div>
      )}

      {/* Warnings */}
      {displayWarnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {displayWarnings.map((warning, i) => (
            <div
              key={i}
              className="px-3 py-2 text-xs font-medium break-words"
              style={{
                backgroundColor: 'var(--color-lime)',
                color: 'var(--color-ink)',
                border: '3px solid var(--color-ink)',
                borderRadius: '10px',
                boxShadow: '3px 3px 0 var(--color-ink)',
              }}
            >
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* Main content: QR + Style */}
      {shouldShowQR ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
          {/* QR Preview */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-8 nb-box-lg w-full">
            <QrPreview
              url={debouncedPayload}
              style={style}
              onInstanceChange={setQrInstance}
            />
          </div>

          {/* Style Panel */}
          <StylePanel
            style={style}
            onChange={setStyle}
            contrastWarning={contrastWarning}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 nb-box-lg px-4 text-center w-full">
          <div
            className="w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mb-3"
            style={{
              backgroundColor: 'var(--color-paper)',
              border: '3px dashed var(--color-ink)',
              borderRadius: '14px',
            }}
          >
            <Info size={24} style={{ color: 'var(--color-ink)', opacity: 0.5 }} />
          </div>
          <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--color-ink)', opacity: 0.6 }}>
            {activeType === 'url' ? 'Enter a URL above to generate your QR code.' : 'Fill in the fields to generate your QR code.'}
          </p>
        </div>
      )}

      {/* Export bar */}
      {shouldShowQR && (
        <div className="mt-4 sticky bottom-3 z-25 w-full">
          <ExportBar instance={qrInstance} hostname={hostname} />
        </div>
      )}
    </div>
  );
}