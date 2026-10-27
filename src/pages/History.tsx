import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HistoryGrid } from '../components/HistoryGrid';
import { loadHistory, saveHistory, removeEntry, clearHistory } from '../lib/history';
import type { HistoryEntry } from '../lib/history';

export function HistoryPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  const handleRemove = (id: string) => {
    const updated = removeEntry(id, entries);
    setEntries(updated);
    saveHistory(updated);
  };

  const handleClearAll = () => {
    clearHistory();
    setEntries([]);
  };

  const handleReopen = (entry: HistoryEntry) => {
    // Navigate to generator with type and field values for restoration
    navigate('/', { 
      state: { 
        prefillUrl: entry.url,
        restoreType: entry.type,
        restoreFieldValues: entry.fieldValues
      } 
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="nb-h2 mb-2">
          History.
        </h1>
        <p className="nb-body" style={{ opacity: 0.7 }}>
          Your recently generated QR codes. Stored locally in your browser.
        </p>
      </div>

      <HistoryGrid
        entries={entries}
        onRemove={handleRemove}
        onClearAll={handleClearAll}
        onReopen={handleReopen}
      />
    </div>
  );
}
