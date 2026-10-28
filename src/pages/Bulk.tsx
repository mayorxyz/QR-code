import { useState, useEffect, useRef, useMemo } from 'react';
import { smartSplit } from '../lib/smartSplit';
import { ChipInput } from '../components/ChipInput';
import { createQrInstance } from '../lib/qr';
import { renderTileCanvas, verifyStyledExport } from '../lib/styledExport';
import { buildNames, buildCsv, parseCsv, type NamingStyle } from '../lib/bulkNaming';
import { Upload, Eye, Edit2, Trash2, Undo } from 'lucide-react';

const STORAGE_KEY = 'qrlink_bulk_chips';
const CC_KEY = 'qrlink_default_cc';
const MAX_CHIPS = 50;

interface UndoAction {
  chips: string[];
  timestamp: number;
}

export function BulkPage() {
  const [chips, setChips] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, MAX_CHIPS);
        }
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [defaultCountryCode, setDefaultCountryCode] = useState(() => {
    try {
      return localStorage.getItem(CC_KEY) || '+234';
    } catch {
      return '+234';
    }
  });

  const [pasteManyMode, setPasteManyMode] = useState(false);
  const [pasteManyText, setPasteManyText] = useState('');

  // Naming options
  const [namingStyle, setNamingStyle] = useState<NamingStyle>('numbered-site');
  const [prefix, setPrefix] = useState('');

  // Export options
  const [exportStyle, setExportStyle] = useState<'tile' | 'plain'>('tile');
  const [exportFormat, setExportFormat] = useState<'png' | 'svg' | 'both'>('png');
  const [includeIndex, setIncludeIndex] = useState(true);

  // Progress
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const cancelRef = useRef(false);

  // Inline preview
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Undo stack
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);

  // Edit mode for result rows
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist chips
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chips.slice(0, MAX_CHIPS)));
      } catch {
        // Ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [chips]);

  // Persist country code
  useEffect(() => {
    try {
      localStorage.setItem(CC_KEY, defaultCountryCode);
    } catch {
      // Ignore
    }
  }, [defaultCountryCode]);

  // Parse chips into items
  const allItems = useMemo(() => {
    return chips.flatMap(raw => smartSplit(raw, { defaultCountryCode }));
  }, [chips, defaultCountryCode]);

  // Track duplicates
  const processedItems = useMemo(() => {
    const seen = new Map<string, number>();
    return allItems.map((item, index) => {
      if (item.type === 'unknown' || !item.payload) {
        return { ...item, status: 'invalid' as const, originalIndex: index };
      }

      if (seen.has(item.payload)) {
        return {
          ...item,
          status: 'duplicate' as const,
          duplicateOf: seen.get(item.payload),
          originalIndex: index
        };
      }

      seen.set(item.payload, index);
      return { ...item, status: 'valid' as const, originalIndex: index };
    });
  }, [allItems]);

  const validItems = useMemo(() => {
    return processedItems.filter(item => item.status === 'valid');
  }, [processedItems]);

  const uniqueCount = validItems.length;
  const capWarning = chips.length >= MAX_CHIPS;

  // Build filenames
  const filenames = useMemo(() => {
    if (validItems.length === 0) return [];
    return buildNames(validItems, { style: namingStyle, prefix });
  }, [validItems, namingStyle, prefix]);

  // Handle country code change
  const handleCountryCodeChange = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+') || cleaned === '') {
      const digits = cleaned.replace(/^\+/, '');
      if (digits.length <= 4) {
        setDefaultCountryCode(cleaned || '+234');
      }
    }
  };

  // Save undo state before deletion
  const saveUndoState = (message: string) => {
    setUndoStack(prev => [
      ...prev.slice(-19),
      { chips: [...chips], timestamp: Date.now() }
    ]);
    setUndoMessage(message);
    setTimeout(() => setUndoMessage(null), 5000);
  };

  // Undo last deletion
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setChips(lastAction.chips);
    setUndoStack(prev => prev.slice(0, -1));
    setUndoMessage('Restored');
    setTimeout(() => setUndoMessage(null), 3000);
  };

  // Delete item by index
  const handleDeleteItem = (itemIndex: number) => {
    saveUndoState(`Link ${itemIndex + 1} deleted`);

    let chipIndex = 0;
    let itemCounter = 0;

    for (let i = 0; i < chips.length; i++) {
      const items = smartSplit(chips[i], { defaultCountryCode });
      if (itemCounter + items.length > itemIndex) {
        chipIndex = i;
        break;
      }
      itemCounter += items.length;
    }

    const newChips = chips.filter((_, i) => i !== chipIndex);
    setChips(newChips);
  };

  // Edit item
  const handleEditItem = (itemIndex: number) => {
    setEditingRowIndex(itemIndex);
    const item = processedItems[itemIndex];
    setEditDraft(item.raw);
  };

  // Save edit
  const handleSaveEdit = () => {
    if (editingRowIndex === null) return;

    const items = smartSplit(editDraft, { defaultCountryCode });
    if (items.length === 0) {
      handleDeleteItem(editingRowIndex);
    } else {
      let chipIndex = 0;
      let itemCounter = 0;

      for (let i = 0; i < chips.length; i++) {
        const chipItems = smartSplit(chips[i], { defaultCountryCode });
        if (itemCounter + chipItems.length > editingRowIndex) {
          chipIndex = i;
          break;
        }
        itemCounter += chipItems.length;
      }

      const newChips = [...chips];
      newChips.splice(chipIndex, 1, ...items.map(item => item.raw));
      setChips(newChips);
    }

    setEditingRowIndex(null);
    setEditDraft('');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingRowIndex(null);
    setEditDraft('');
  };

  // Remove invalid items
  const handleRemoveInvalid = () => {
    saveUndoState('Invalid items removed');
    const validChips = chips.filter(raw => {
      const items = smartSplit(raw, { defaultCountryCode });
      return items.some(item => item.type !== 'unknown' && item.payload);
    });
    setChips(validChips);
  };

  // Remove duplicates
  const handleRemoveDuplicates = () => {
    saveUndoState('Duplicates removed');
    const seen = new Set<string>();
    const validChips = chips.filter(raw => {
      const items = smartSplit(raw, { defaultCountryCode });
      const hasNew = items.some(item => {
        if (item.type === 'unknown' || !item.payload) return false;
        if (seen.has(item.payload)) return false;
        seen.add(item.payload);
        return true;
      });
      return hasNew;
    });
    setChips(validChips);
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm('Clear all items?')) {
      saveUndoState('All items cleared');
      setChips([]);
    }
  };

  // Toggle paste many mode
  const handleTogglePasteMany = () => {
    if (pasteManyMode) {
      const items = smartSplit(pasteManyText, { defaultCountryCode });
      const newChips = items.map(item => item.raw);
      setChips(newChips.slice(0, MAX_CHIPS));
      if (newChips.length > MAX_CHIPS) {
        alert(`Only the first ${MAX_CHIPS} were used.`);
      }
      setPasteManyText('');
    } else {
      const text = chips.join('\n');
      setPasteManyText(text);
    }
    setPasteManyMode(!pasteManyMode);
  };

  // Toggle preview
  const handleTogglePreview = async (index: number) => {
    if (previewIndex === index) {
      setPreviewIndex(null);
      setPreviewUrl(null);
      return;
    }

    const item = validItems[index];
    if (!item) return;

    const instance = createQrInstance(item.payload, {
      foreground: '#000000',
      background: '#FFFFFF',
      dotStyle: 'square',
      cornerStyle: 'square',
      logo: null,
      size: 256,
      errorCorrection: 'M',
    });

    const blob = await instance.getRawData('png');
    if (blob) {
      const url = URL.createObjectURL(blob as Blob);
      setPreviewUrl(url);
      setPreviewIndex(index);
    }
  };

  // Import CSV
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileText = await file.text();
    const csvRows = parseCsv(fileText);

    if (csvRows.length === 0) return;

    const firstRow = csvRows[0];
    const hasHeader = firstRow.length >= 1 &&
      (firstRow[0].toLowerCase() === 'label' || firstRow[0].toLowerCase() === 'url' || firstRow[0].toLowerCase() === 'payload');

    const dataRows = hasHeader ? csvRows.slice(1) : csvRows;

    const lines: string[] = [];
    for (const row of dataRows.slice(0, MAX_CHIPS)) {
      if (row.length >= 2 && row[0]) {
        lines.push(`${row[0]} | ${row[1]}`);
      } else if (row.length >= 1) {
        lines.push(row[0]);
      }
    }

    const items = smartSplit(lines.join('\n'), { defaultCountryCode });
    setChips(items.map(item => item.raw).slice(0, MAX_CHIPS));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Export
  const handleExport = async () => {
    if (validItems.length === 0) return;

    setExporting(true);
    setProgress({ current: 0, total: validItems.length });
    cancelRef.current = false;

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const indexRows: string[][] = [];
    const failedRows: typeof validItems = [];

    for (let i = 0; i < validItems.length; i++) {
      if (cancelRef.current) break;

      const item = validItems[i];
      const filename = filenames[i];
      setProgress({ current: i + 1, total: validItems.length });

      try {
        const instance = createQrInstance(item.payload, {
          foreground: '#000000',
          background: '#FFFFFF',
          dotStyle: 'square',
          cornerStyle: 'square',
          logo: null,
          size: 1024,
          errorCorrection: 'M',
        });

        let usePlain = false;
        let note = '';

        if (exportFormat === 'png' || exportFormat === 'both') {
          let pngBlob: Blob | null = null;

          if (exportStyle === 'tile') {
            const qrBlob = await instance.getRawData('png');
            if (qrBlob) {
              const qrCanvas = document.createElement('canvas');
              const img = new Image();
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = URL.createObjectURL(qrBlob as Blob);
              });
              qrCanvas.width = img.width;
              qrCanvas.height = img.height;
              const ctx = qrCanvas.getContext('2d')!;
              ctx.drawImage(img, 0, 0);

              const tileCanvas = renderTileCanvas(qrCanvas, 1600, false);
              const verified = await verifyStyledExport(tileCanvas, item.payload);

              if (verified) {
                pngBlob = await new Promise<Blob | null>(resolve => tileCanvas.toBlob(resolve, 'image/png'));
              } else {
                usePlain = true;
                note = 'plain (tile failed scan check)';
                pngBlob = qrBlob as Blob;
              }
            }
          }

          if (!pngBlob) {
            pngBlob = (await instance.getRawData('png')) as Blob | null;
          }

          if (pngBlob) {
            const folder = exportFormat === 'both' ? 'png' : '';
            zip.file(folder ? `${folder}/${filename}.png` : `${filename}.png`, pngBlob);
          }
        }

        if (exportFormat === 'svg' || exportFormat === 'both') {
          const svgBlob = await instance.getRawData('svg');
          if (svgBlob) {
            const folder = exportFormat === 'both' ? 'svg' : '';
            zip.file(folder ? `${folder}/${filename}.svg` : `${filename}.svg`, svgBlob as Blob);
          }
        }

        indexRows.push([
          String(i + 1),
          filename,
          item.label || '',
          item.payload,
          item.type,
          note,
        ]);
      } catch (err) {
        failedRows.push(item);
        indexRows.push([
          String(i + 1),
          filename,
          item.label || '',
          item.payload,
          item.type,
          `ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ]);
      }

      await new Promise(r => setTimeout(r, 0));
    }

    if (includeIndex) {
      const csv = buildCsv(
        ['index', 'filename', 'label', 'payload', 'type', 'note'],
        indexRows
      );
      zip.file('index.csv', csv);
    }

    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
    });

    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    a.href = url;
    a.download = `qr-bulk-${date}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setProgress({ current: 0, total: 0 });

    if (failedRows.length > 0) {
      alert(`${failedRows.length} item(s) failed to export. Check index.csv for details.`);
    }
  };

  // Get type badge color
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'url':
        return { backgroundColor: 'var(--color-teal)', color: '#fff' };
      case 'email':
        return { backgroundColor: 'var(--color-purple)', color: '#fff' };
      case 'phone':
        return { backgroundColor: 'var(--color-orange)', color: '#fff' };
      default:
        return { backgroundColor: 'var(--color-pink)', color: '#fff' };
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
      <div className="mb-6 sm:mb-8">
        <h1 className="nb-h2 mb-2 text-2xl sm:text-4xl font-black">Bulk QR Generator</h1>
        <p className="nb-body text-sm sm:text-base opacity-70">
          Add links, emails, and phone numbers. The smart splitter detects them automatically.
        </p>
      </div>

      {/* Controls above chip box */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="country-code" className="text-xs sm:text-sm font-medium whitespace-nowrap">
            Default country code:
          </label>
          <input
            id="country-code"
            type="text"
            value={defaultCountryCode}
            onChange={e => handleCountryCodeChange(e.target.value)}
            placeholder="+234"
            className="w-24 p-2 text-sm nb-input"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="nb-hl text-xs sm:text-sm py-1 px-2.5">
            {chips.length} pasted, {uniqueCount} unique
          </div>

          <button
            onClick={handleTogglePasteMany}
            className="nb-btn-secondary !py-2 !px-3 !text-xs sm:text-sm"
          >
            {pasteManyMode ? 'Use Chips' : 'Paste many'}
          </button>
        </div>
      </div>

      {/* Chip box or textarea */}
      <div className="mb-6">
        {pasteManyMode ? (
          <textarea
            value={pasteManyText}
            onChange={e => setPasteManyText(e.target.value)}
            placeholder={`https://example.com\nfacebook.com/page\n+234 801 234 5678\nhello@example.com`}
            rows={8}
            className="w-full p-4 outline-none resize-y nb-input text-sm sm:text-base"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              minHeight: '220px',
            }}
          />
        ) : (
          <ChipInput
            chips={chips}
            onChange={setChips}
            options={{ defaultCountryCode }}
            maxChips={MAX_CHIPS}
          />
        )}
        {capWarning && (
          <p className="text-xs mt-2 font-bold" style={{ color: 'var(--color-orange)' }}>
            Only the first {MAX_CHIPS} were used.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
        <button
          onClick={handleRemoveInvalid}
          className="nb-btn-secondary !py-2 !px-3 !text-xs sm:text-sm"
          disabled={processedItems.every(item => item.status !== 'invalid')}
        >
          Remove invalid
        </button>
        <button
          onClick={handleRemoveDuplicates}
          className="nb-btn-secondary !py-2 !px-3 !text-xs sm:text-sm"
          disabled={processedItems.every(item => item.status !== 'duplicate')}
        >
          Remove duplicates
        </button>
        <button
          onClick={handleClearAll}
          className="nb-btn-secondary !py-2 !px-3 !text-xs sm:text-sm"
          style={{ backgroundColor: 'var(--color-pink)' }}
          disabled={chips.length === 0}
        >
          Clear all
        </button>
        {undoStack.length > 0 && (
          <button
            onClick={handleUndo}
            className="nb-btn-secondary !py-2 !px-3 !text-xs sm:text-sm flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--color-lime)' }}
          >
            <Undo size={14} />
            <span>Undo</span>
          </button>
        )}
      </div>

      {/* Undo message */}
      {undoMessage && (
        <div
          className="nb-box p-3 mb-6 text-xs sm:text-sm font-bold"
          style={{ backgroundColor: 'var(--color-lime)' }}
          aria-live="polite"
        >
          {undoMessage}
        </div>
      )}

      {/* CSV Import */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleImportCsv}
          className="hidden"
          id="csv-import"
        />
        <label
          htmlFor="csv-import"
          className="nb-btn-secondary inline-flex items-center gap-2 cursor-pointer text-xs sm:text-sm py-2 px-4"
        >
          <Upload size={14} />
          <span>Import CSV</span>
        </label>
      </div>

      {/* Results */}
      {processedItems.length > 0 && (
        <>
          <div className="space-y-3 mb-6" aria-live="polite">
            {processedItems.map((item, index) => (
              <div
                key={index}
                className="nb-box p-3 sm:p-4"
                style={{
                  borderColor: item.status === 'invalid' ? 'var(--color-pink)' :
                             item.status === 'duplicate' ? 'var(--color-orange)' : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-xs sm:text-sm"
                      style={{
                        backgroundColor: item.status === 'valid' ? 'var(--color-lime)' :
                                         item.status === 'invalid' ? 'var(--color-pink)' :
                                         item.status === 'duplicate' ? 'var(--color-orange)' :
                                         'var(--color-paper)',
                        border: '2px solid var(--color-ink)',
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingRowIndex === index ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editDraft}
                            onChange={e => setEditDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="flex-1 p-2 text-xs sm:text-sm nb-input"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className="nb-badge text-[10px] px-2 py-0.5"
                              style={getTypeBadgeStyle(item.type)}
                            >
                              {item.type.toUpperCase()}
                            </span>
                            {item.label && (
                              <span className="text-xs sm:text-sm font-bold truncate max-w-[150px] sm:max-w-xs">{item.label}</span>
                            )}
                          </div>

                          <div
                            className="text-xs sm:text-sm truncate mb-1"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            title={item.display}
                          >
                            {item.display}
                          </div>

                          {item.status === 'valid' && (
                            <div className="inline-block nb-hl text-[10px] py-0.5 px-2" style={{ backgroundColor: 'var(--color-lime)' }}>
                              Valid
                            </div>
                          )}

                          {item.status === 'invalid' && item.error && (
                            <div className="text-xs font-bold" style={{ color: 'var(--color-orange)' }}>
                              {item.error}
                            </div>
                          )}

                          {item.status === 'duplicate' && (
                            <div className="inline-block nb-hl text-[10px] py-0.5 px-2" style={{ backgroundColor: 'var(--color-pink)' }}>
                              Duplicate of #{(item.duplicateOf ?? 0) + 1}
                            </div>
                          )}

                          {item.warning && (
                            <div className="text-xs mt-1 font-medium" style={{ color: 'var(--color-orange)' }}>
                              ⚠️ {item.warning}
                            </div>
                          )}

                          {/* Inline preview */}
                          {previewIndex === index && previewUrl && item.status === 'valid' && (
                            <div className="mt-3">
                              <img
                                src={previewUrl}
                                alt="QR preview"
                                className="w-28 h-28 sm:w-32 sm:h-32 border-2 border-black rounded"
                              />
                            </div>
                          )}

                          {item.status === 'valid' && (
                            <button
                              onClick={() => handleTogglePreview(index)}
                              className="mt-2 text-xs font-bold flex items-center gap-1 opacity-70 hover:opacity-100"
                              style={{ color: 'var(--color-ink)' }}
                            >
                              <Eye size={13} />
                              <span>{previewIndex === index ? 'Hide preview' : 'Preview QR'}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Edit and Delete buttons */}
                  {editingRowIndex !== index && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEditItem(index)}
                        className="nb-btn-secondary !p-2 flex items-center justify-center"
                        aria-label={`Edit link ${index + 1}`}
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(index)}
                        className="nb-btn-secondary !p-2 flex items-center justify-center"
                        aria-label={`Delete link ${index + 1}`}
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Naming controls */}
          {validItems.length > 0 && (
            <div className="nb-box p-4 sm:p-6 mb-6">
              <h3 className="nb-label mb-4 text-xs sm:text-sm font-bold uppercase">Naming</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-2 font-bold uppercase">Style</label>
                  <div className="nb-segment grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setNamingStyle('numbered-site')}
                      className={`${namingStyle === 'numbered-site' ? 'nb-active' : ''} text-xs py-2 px-2 text-center`}
                    >
                      Numbered
                    </button>
                    <button
                      onClick={() => setNamingStyle('label')}
                      className={`${namingStyle === 'label' ? 'nb-active' : ''} text-xs py-2 px-2 text-center`}
                    >
                      Label
                    </button>
                    <button
                      onClick={() => setNamingStyle('site-path')}
                      className={`${namingStyle === 'site-path' ? 'nb-active' : ''} text-xs py-2 px-2 text-center`}
                    >
                      Site-Path
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="prefix" className="block text-xs mb-2 font-bold uppercase">
                    Prefix (optional)
                  </label>
                  <input
                    id="prefix"
                    type="text"
                    value={prefix}
                    onChange={e => setPrefix(e.target.value.slice(0, 20))}
                    placeholder="e.g., QR"
                    maxLength={20}
                    className="w-full p-2.5 sm:p-3 text-sm nb-input"
                  />
                </div>

                {/* Live preview */}
                {validItems.length > 0 && (
                  <div>
                    <label className="block text-xs mb-2 font-bold uppercase">Preview</label>
                    <div className="space-y-1 bg-white/50 p-2.5 rounded border border-black/10">
                      {validItems.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="text-xs truncate"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          title={filenames[i]}
                        >
                          {filenames[i]}.png
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export options */}
          {validItems.length > 0 && (
            <div className="nb-box p-4 sm:p-6 mb-6">
              <h3 className="nb-label mb-4 text-xs sm:text-sm font-bold uppercase">Export Options</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-2 font-bold uppercase">Style</label>
                  <div className="nb-segment grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setExportStyle('tile')}
                      className={`${exportStyle === 'tile' ? 'nb-active' : ''} text-xs py-2 text-center`}
                    >
                      Tile
                    </button>
                    <button
                      onClick={() => setExportStyle('plain')}
                      className={`${exportStyle === 'plain' ? 'nb-active' : ''} text-xs py-2 text-center`}
                    >
                      Plain
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-2 font-bold uppercase">Format</label>
                  <div className="nb-segment grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setExportFormat('png')}
                      className={`${exportFormat === 'png' ? 'nb-active' : ''} text-xs py-2 text-center`}
                    >
                      PNG
                    </button>
                    <button
                      onClick={() => setExportFormat('svg')}
                      className={`${exportFormat === 'svg' ? 'nb-active' : ''} text-xs py-2 text-center`}
                    >
                      SVG
                    </button>
                    <button
                      onClick={() => setExportFormat('both')}
                      className={`${exportFormat === 'both' ? 'nb-active' : ''} text-xs py-2 text-center`}
                    >
                      Both
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={includeIndex}
                    onChange={e => setIncludeIndex(e.target.checked)}
                    className="w-4 h-4 cursor-pointer rounded"
                    style={{ accentColor: 'var(--color-lime)' }}
                  />
                  <span className="text-xs sm:text-sm font-bold">Include index.csv</span>
                </label>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {exporting && (
            <div className="nb-box p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-bold">
                  Building {progress.current} of {progress.total}
                </span>
                <button
                  onClick={() => { cancelRef.current = true; }}
                  className="nb-btn-secondary !py-1 !px-2.5 !text-xs"
                >
                  Cancel
                </button>
              </div>
              <div
                className="w-full h-5 sm:h-6 rounded overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '2px solid var(--color-ink)',
                }}
              >
                <div
                  className="h-full transition-all duration-150"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    backgroundColor: 'var(--color-lime)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Main Export Action Button */}
          <div className="mb-8">
            <button
              onClick={handleExport}
              disabled={exporting || validItems.length === 0}
              className="nb-btn-primary w-full py-3.5 px-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2"
            >
              {exporting ? 'Exporting ZIP...' : `Download ${validItems.length} QR Codes (ZIP)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}