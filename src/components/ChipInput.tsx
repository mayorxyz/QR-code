import { useState, useRef, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { smartSplit, type Item, type ItemType, type SmartSplitOptions } from '../lib/smartSplit';

interface ChipInputProps {
  chips: string[];
  onChange: (chips: string[]) => void;
  options: SmartSplitOptions;
  maxChips?: number;
}

interface ChipData {
  raw: string;
  items: Item[];
}

const MONO = "'JetBrains Mono', monospace";

export function ChipInput({ chips, onChange, options, maxChips = 50 }: ChipInputProps) {
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const editDoneRef = useRef(false);

  // Parse chips into items
  const chipDataList: ChipData[] = chips.map(raw => ({
    raw,
    items: smartSplit(raw, options),
  }));
  const allItems: Item[] = chipDataList.flatMap(cd => cd.items);

  // Status per item (valid / invalid / duplicate)
  const itemStatuses = allItems.map((item, index) => {
    if (item.type === 'unknown' || !item.payload) {
      return { ...item, status: 'invalid' as const, duplicateOf: undefined as number | undefined };
    }
    const firstIndex = allItems.findIndex(i => i.payload === item.payload);
    if (firstIndex !== index) {
      return { ...item, status: 'duplicate' as const, duplicateOf: firstIndex };
    }
    return { ...item, status: 'valid' as const, duplicateOf: undefined as number | undefined };
  });

  // Add new chips, respecting the cap
  const addChips = (newChips: string[]) => {
    if (newChips.length === 0) return;
    const room = maxChips - chips.length;
    if (room <= 0) {
      setNote(`Only the first ${maxChips} were used.`);
      return;
    }
    if (newChips.length > room) {
      onChange([...chips, ...newChips.slice(0, room)]);
      setNote(`Only the first ${maxChips} were used.`);
    } else {
      onChange([...chips, ...newChips]);
      setNote(null);
    }
  };

  // Turn text into chips
  const commitText = (text: string) => {
    const items = smartSplit(text, options);
    if (items.length === 0) {
      setDraft('');
      return;
    }
    addChips(items.map(item => item.raw));
    setDraft('');
  };

  // Phone-like text with fewer than 10 digits: keep typing, do not commit on space
  const isPhoneIncomplete = (text: string): boolean => {
    const trimmed = text.trim();
    if (!/^[\d+\-().\s]+$/.test(trimmed)) return false;
    const digits = (trimmed.match(/\d/g) || []).length;
    return digits < 10;
  };

  // Works on every keyboard: reacts to the typed text, not to key events
  const handleDraftChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const last = v.slice(-1);

    if (last === ',' || last === ';' || last === '\n') {
      const t = v.slice(0, -1);
      if (t.trim()) commitText(t);
      else setDraft('');
      return;
    }

    if (last === ' ') {
      const t = v.slice(0, -1);
      if (!t.trim()) {
        setDraft('');
        return;
      }
      if (!isPhoneIncomplete(t)) {
        commitText(t);
        return;
      }
    }

    setDraft(v);
  };

  const handleDraftKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && draft.trim())) {
      if (draft.trim()) {
        e.preventDefault();
        commitText(draft);
      }
    } else if (e.key === 'Backspace' && !draft && chips.length > 0) {
      e.preventDefault();
      const last = chips[chips.length - 1];
      onChange(chips.slice(0, -1));
      setDraft(last);
    } else if (e.key === 'ArrowLeft' && draftInputRef.current?.selectionStart === 0 && chips.length > 0) {
      e.preventDefault();
      chipRefs.current[chips.length - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text/plain');
    const items = smartSplit(pasted, options);
    if (items.length === 0) return;

    e.preventDefault();
    const fromDraft = draft.trim() ? smartSplit(draft, options).map(i => i.raw) : [];
    setDraft('');
    addChips([...fromDraft, ...items.map(i => i.raw)]);
  };

  const handleDraftBlur = () => {
    if (draft.trim()) commitText(draft);
  };

  // ---- Editing a chip (own state, no shared draft) ----
  const startEdit = (index: number) => {
    editDoneRef.current = false;
    setEditingIndex(index);
    setEditDraft(chips[index]);
  };

  const finishEdit = (save: boolean) => {
    if (editingIndex === null || editDoneRef.current) return;
    editDoneRef.current = true;

    if (save) {
      const items = smartSplit(editDraft, options);
      const next = [...chips];
      if (items.length === 0) {
        next.splice(editingIndex, 1);
      } else {
        next.splice(editingIndex, 1, ...items.map(i => i.raw));
      }
      onChange(next.slice(0, maxChips));
    }
    setEditingIndex(null);
    setEditDraft('');
  };

  const handleChipKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      startEdit(index);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const next = chips.filter((_, i) => i !== index);
      onChange(next);
      if (next.length === 0) draftInputRef.current?.focus();
      else setTimeout(() => chipRefs.current[Math.min(index, next.length - 1)]?.focus(), 0);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      chipRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < chips.length - 1) chipRefs.current[index + 1]?.focus();
      else draftInputRef.current?.focus();
    }
  };

  const handleChipRemove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(chips.filter((_, i) => i !== index));
    setNote(null);
    draftInputRef.current?.focus();
  };

  // ---- Styles ----
  const getTypeBadgeStyle = (type: ItemType) => {
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

  const getChipStyle = (status: 'valid' | 'invalid' | 'duplicate') => {
    switch (status) {
      case 'valid':
        return { backgroundColor: 'var(--color-lime)' };
      case 'invalid':
        return { backgroundColor: 'var(--color-orange)', color: '#000' };
      case 'duplicate':
        return { backgroundColor: 'var(--color-pink)' };
    }
  };

  const showPlaceholder = chips.length === 0 && !draft;
  const atCap = chips.length >= maxChips;

  return (
    <div>
      <div
        role="group"
        aria-label="Links"
        onClick={e => {
          if (e.target === e.currentTarget) draftInputRef.current?.focus();
        }}
        className="nb-box"
        style={{
          minHeight: '240px',
          padding: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'flex-start',
          alignContent: 'flex-start',
          cursor: 'text',
        }}
      >
        {chipDataList.map((chipData, chipIndex) => {
          if (editingIndex === chipIndex) {
            return (
              <input
                key={`edit-${chipIndex}`}
                type="text"
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    finishEdit(true);
                  } else if (e.key === 'Escape') {
                    finishEdit(false);
                  }
                }}
                onBlur={() => finishEdit(true)}
                autoFocus
                enterKeyHint="done"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Edit link"
                className="nb-input"
                style={{
                  flex: '1 1 200px',
                  minWidth: '160px',
                  minHeight: '44px',
                  fontFamily: MONO,
                  fontSize: '16px',
                }}
              />
            );
          }

          return chipData.items.map((item, itemIndex) => {
            const globalIndex =
              chipDataList.slice(0, chipIndex).reduce((sum, cd) => sum + cd.items.length, 0) + itemIndex;
            const status = itemStatuses[globalIndex];

            return (
              <div
                key={`${chipIndex}-${itemIndex}`}
                ref={el => {
                  chipRefs.current[chipIndex] = el;
                }}
                tabIndex={0}
                role="button"
                aria-label={`${item.display}. Press Enter to edit, Delete to remove.`}
                onClick={e => {
                  e.stopPropagation();
                  startEdit(chipIndex);
                }}
                onKeyDown={e => handleChipKeyDown(e, chipIndex)}
                style={{
                  ...getChipStyle(status.status),
                  border: '3px solid var(--color-ink)',
                  borderRadius: '10px',
                  boxShadow: '3px 3px 0 var(--color-ink)',
                  padding: '6px 6px 6px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  maxWidth: '100%',
                  minWidth: 0,
                }}
                title={
                  status.status === 'duplicate'
                    ? `Duplicate of #${(status.duplicateOf ?? 0) + 1}`
                    : item.error || item.display
                }
              >
                <span
                  className="nb-badge"
                  style={{
                    ...getTypeBadgeStyle(item.type),
                    fontSize: '10px',
                    padding: '2px 6px',
                    flexShrink: 0,
                  }}
                >
                  {item.type === 'unknown' ? '?' : item.type.toUpperCase()}
                </span>

                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: '12px',
                    color: status.status === 'invalid' ? '#000' : 'var(--color-ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    maxWidth: 'min(60vw, 320px)',
                  }}
                  title={item.display}
                >
                  {item.display}
                </span>

                <button
                  type="button"
                  onClick={e => handleChipRemove(chipIndex, e)}
                  aria-label={`Remove ${item.display}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: '44px',
                    height: '44px',
                    margin: '-12px -6px -12px -8px',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            );
          });
        })}

        {/* Draft input */}
        <input
          ref={draftInputRef}
          type="text"
          value={draft}
          onChange={handleDraftChange}
          onKeyDown={handleDraftKeyDown}
          onPaste={handlePaste}
          onBlur={handleDraftBlur}
          placeholder={showPlaceholder ? 'Type or paste links, numbers or emails' : atCap ? 'Limit reached' : ''}
          disabled={atCap}
          inputMode="text"
          enterKeyHint="done"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Add a link, phone number or email"
          style={{
            flex: '1 1 160px',
            minWidth: '160px',
            minHeight: '44px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: MONO,
            fontSize: '16px',
            padding: '6px',
          }}
        />

        {draft.trim() && (
          <button
            type="button"
            // onMouseDown prevents the input blur from committing first and racing this click
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              commitText(draft);
              draftInputRef.current?.focus();
            }}
            className="nb-btn-secondary"
            style={{ minHeight: '44px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            aria-label="Add to list"
          >
            <Plus size={16} />
            Add
          </button>
        )}
      </div>

      <div aria-live="polite" className="text-xs mt-2 font-medium" style={{ minHeight: '1em', color: 'var(--color-orange)' }}>
        {note}
      </div>
    </div>
  );
}