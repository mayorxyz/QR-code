import { payloadTypes } from '../lib/payloads';
import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PayloadTabsProps {
  activeType: string;
  onChange: (typeId: string) => void;
}

export function PayloadTabs({ activeType, onChange }: PayloadTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        ref.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative">
      {/* Left arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded-full shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Scrollable container */}
      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-2 min-w-max">
          {payloadTypes.map(type => (
            <button
              key={type.id}
              onClick={() => onChange(type.id)}
              className="nb-btn-secondary !py-2 !px-4 !text-xs whitespace-nowrap"
              style={activeType === type.id ? { backgroundColor: 'var(--color-lime)' } : {}}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded-full shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
