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
import { StyledExportPanel } from '../components/StyledExportPanel';

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
  
  // URL-specific state
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
  const [qrCanvas, setQrCanvas] = useState<HTMLCanvasElement | null>(null);
  const [duplicateFlash, setDuplicateFlash] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedPayload, setDebouncedPayload] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // Clear stale 3D view localStorage on mount
  useEffect(() => {
    try {
      localStorage.removeItem('qrlink_view_3d');
      localStorage.removeItem('qrlink_tree_season');
    } catch {
      // ignore
    }
  }, []);
  
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

  const shouldShowQR = activeType === 'url' 
    ? (sanitizedUrl && !sanitizeError)
    : (payload && Object.keys(validationErrors).length === 0);

  const displayWarnings = activeType === 'url' 
    ? (sanitizeWarning ? [sanitizeWarning] : [])
    : validationWarnings;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 overflow-x-hidden">
      {/* Hero & Input Section */}
      <section className="mb-6 lg:mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Main Form/Input Area */}
          <div className="lg:col-span-7 xl:col-span-8 w-full min-w-0">
            <h1 className="nb-h1 mb-2.5 text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Paste a link.{' '}
              <br className="hidden sm:inline" />
              Get a{' '}
              <span className="nb-hl inline-block transform -translate-y-0.5 sm:-translate-y-1">
                QR code.
              </span>
            </h1>
            <p className="nb-body mb-5 text-sm sm:text-lg opacity-80">
              Free, instant, and 100% private. Nothing leaves your browser.
            </p>

            {/* Duplicate Flash Notification */}
            {duplicateFlash && (
              <div
                className="mb-4 px-3 py-2 text-xs sm:text-sm font-bold animate-fade-in"
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

            {/* Main Interactive Box */}
            <div
              className="p-3 sm:p-6 lg:p-8 w-full transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-paper)',
                border: '3px solid var(--color-ink)',
                borderRadius: '20px',
                boxShadow: '5px 5px 0 var(--color-ink)',
              }}
            >
              {/* Tab navigation bar with horizontal scroll support */}
              <div className="mb-5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
                <PayloadTabs activeType={activeType} onChange={handleTabChange} />
              </div>

              {/* Dynamic Payload Form Input */}
              {activeType === 'url' ? (
                <UrlInput
                  value={rawInput}
                  onChange={setRawInput}
                  error={sanitizeError}
                  warning={sanitizeWarning}
                />
              ) : (() => {
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

          {/* Decorative Preview Stage (Desktop View Only >= 1024px) */}
          <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 justify-center">
            <div
              className="nb-hero-stage flex flex-col items-center justify-center gap-4 p-6 w-full max-w-[340px] relative"
              style={{
                minHeight: '380px',
              }}
              aria-hidden="true"
            >
              {/* Teal Card */}
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

              {/* Paper Checker Card */}
              <div
                className="nb-bob-delay w-full p-5 relative"
                style={{
                  backgroundColor: 'var(--color-paper)',
                  border: '3px solid var(--color-ink)',
                  borderRadius: '16px',
                  boxShadow: '6px 6px 0 var(--color-ink)',
                }}
              >
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

              {/* Floating Meta Tags */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="nb-tag nb-platform-facebook text-xs px-2 py-0.5">Facebook</span>
                <span className="nb-tag nb-platform-x text-xs px-2 py-0.5">X</span>
                <span className="nb-tag nb-platform-tiktok text-xs px-2 py-0.5">Tiktok</span>
                <span className="nb-tag text-xs px-2 py-0.5" style={{ backgroundColor: 'var(--color-orange)', color: '#fff' }}>Scanned!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* URL Meta / Sanitization Status Banners */}
      {activeType === 'url' && normalized && normalized.changed && !useOriginal && (
        <div
          className="mb-5 p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
          style={{
            backgroundColor: 'var(--color-teal)',
            border: '3px solid var(--color-ink)',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 var(--color-ink)',
          }}
        >
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <p className="nb-label text-xs mb-0.5 uppercase tracking-wider font-bold" style={{ color: 'var(--color-ink)' }}>
              Cleaned link
            </p>
            <p className="text-xs sm:text-sm font-mono font-medium truncate break-all" style={{ color: 'var(--color-ink)' }}>
              {normalized.displayUrl}
            </p>
            {normalized.removedParams.length > 0 && (
              <p className="text-xs mt-1 font-medium opacity-80 break-words" style={{ color: 'var(--color-ink)' }}>
                Removed: {normalized.removedParams.join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={() => setUseOriginal(true)}
            className="nb-btn-secondary w-full sm:w-auto shrink-0 !py-2 !px-3.5 !text-xs flex items-center justify-center gap-1.5"
          >
            <Undo2 size={14} />
            Use original
          </button>
        </div>
      )}

      {activeType === 'url' && useOriginal && (
        <button
          onClick={() => setUseOriginal(false)}
          className="mb-4 flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-colors hover:underline"
          style={{ color: 'var(--color-ink)' }}
        >
          <Undo2 size={14} />
          Using original URL — switch back to cleaned
        </button>
      )}

      {/* Platform Chip */}
      {activeType === 'url' && platform && sanitizedUrl && (
        <div className="mb-5">
          <PlatformChip name={platform.name} icon={platform.icon} note={platform.note} />
        </div>
      )}

      {/* Type Badge Header (Non-URL types) */}
      {activeType !== 'url' && payload && (
        <div className="mb-5 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="nb-badge px-3 py-1 text-xs sm:text-sm font-bold" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>
            {getPayloadType(activeType)?.label}
          </span>
          <span className="nb-badge px-3 py-1 text-xs sm:text-sm font-bold" style={{ backgroundColor: 'var(--color-pink)', color: 'var(--color-ink)' }}>
            {payload.length} chars
          </span>
        </div>
      )}

      {/* Warnings List */}
      {displayWarnings.length > 0 && (
        <div className="mb-5 space-y-2">
          {displayWarnings.map((warning, i) => (
            <div
              key={i}
              className="px-3.5 py-2.5 text-xs sm:text-sm font-bold"
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

      {/* Generator Workspace: Dynamic Dual Column Layout */}
      {shouldShowQR ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left / Top Container: QR Preview */}
          <div className="lg:col-span-5 xl:col-span-5 w-full lg:sticky lg:top-6 z-10">
            <div className="flex flex-col items-center justify-center p-4 sm:p-8 lg:p-10 nb-box-lg w-full min-h-[280px] sm:min-h-[380px]">
              <QrPreview
                url={debouncedPayload}
                style={style}
                onInstanceChange={setQrInstance}
                onCanvasReady={setQrCanvas}
              />
            </div>
          </div>

          {/* Right / Bottom Container: Styling Options */}
          <div className="lg:col-span-7 xl:col-span-7 w-full min-w-0">
            <StylePanel
              style={style}
              onChange={setStyle}
              contrastWarning={contrastWarning}
            />
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 sm:py-24 px-4 nb-box-lg text-center">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-4 shrink-0"
            style={{
              backgroundColor: 'var(--color-paper)',
              border: '3px dashed var(--color-ink)',
              borderRadius: '16px',
            }}
          >
            <Info size={26} className="opacity-50" style={{ color: 'var(--color-ink)' }} />
          </div>
          <p className="text-xs sm:text-base font-medium opacity-70 max-w-sm" style={{ color: 'var(--color-ink)' }}>
            {activeType === 'url' ? 'Enter a valid URL above to generate your QR code.' : 'Fill out the required fields above to generate your QR code.'}
          </p>
        </div>
      )}

      {/* Styled Export Card */}
      {shouldShowQR && qrCanvas && (
        <div className="mt-6 sm:mt-8">
          <StyledExportPanel
            qrCanvas={qrCanvas}
            payload={debouncedPayload}
            host={hostname}
            platform={platform?.name}
          />
        </div>
      )}

      {/* Export Bar */}
      {shouldShowQR && (
        <div className="mt-6 sm:mt-8">
          <ExportBar instance={qrInstance} hostname={hostname} payload={debouncedPayload} />
        </div>
      )}
    </div>
  );
}