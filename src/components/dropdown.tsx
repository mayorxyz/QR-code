import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export function Dropdown({ id, value, options, onChange, error, ...props }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const currentIndex = options.indexOf(value);
      const nextIndex = (currentIndex + 1) % options.length;
      onChange(options[nextIndex]);
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      const currentIndex = options.indexOf(value);
      const prevIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
      onChange(options[prevIndex]);
    }
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Dropdown Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="w-full p-3 text-sm text-left outline-none transition-all duration-150 flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: 'var(--color-paper)',
          border: `3px solid ${error ? 'var(--color-pink)' : 'var(--color-ink)'}`,
          borderRadius: '12px',
          boxShadow: error ? '4px 4px 0 var(--color-pink)' : '4px 4px 0 var(--color-ink)',
          color: 'var(--color-ink)',
          fontFamily: "'DM Sans', sans-serif",
          minHeight: '48px',
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        {...props}
      >
        <span>{value}</span>
        <ChevronDown
          size={18}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 w-full mt-2 overflow-hidden"
          style={{
            backgroundColor: 'var(--color-paper)',
            border: '3px solid var(--color-ink)',
            borderRadius: '12px',
            boxShadow: '6px 6px 0 var(--color-ink)',
          }}
        >
          {options.map((option) => (
            <button
              key={option}
              role="option"
              aria-selected={value === option}
              onClick={() => handleSelect(option)}
              className="w-full p-3 text-sm text-left transition-colors duration-150 cursor-pointer"
              style={{
                backgroundColor: value === option ? 'var(--color-lime)' : 'var(--color-paper)',
                color: 'var(--color-ink)',
                borderBottom: '2px solid var(--color-ink)',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: value === option ? 700 : 400,
              }}
              onMouseEnter={(e) => {
                if (value !== option) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = value === option ? 'var(--color-lime)' : 'var(--color-paper)';
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}