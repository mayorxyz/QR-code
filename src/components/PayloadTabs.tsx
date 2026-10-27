import { payloadTypes } from '../lib/payloads';

interface PayloadTabsProps {
  activeType: string;
  onChange: (typeId: string) => void;
}


export function PayloadTabs({ activeType, onChange }: PayloadTabsProps) {
  return (
    <div 
      className="w-full overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="flex gap-2 min-w-max items-center">
        {payloadTypes.map(type => {
          const isActive = activeType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onChange(type.id)}
              className="nb-btn-secondary !py-2 !px-3.5 sm:!px-4 !text-xs whitespace-nowrap min-h-[40px] transition-all duration-150 active:scale-95"
              style={{
                backgroundColor: isActive ? 'var(--color-lime)' : 'var(--color-paper)',
                fontWeight: isActive ? 700 : 600,
                boxShadow: isActive ? '2px 2px 0 var(--color-ink)' : '2px 2px 0 var(--color-ink)',
              }}
              aria-pressed={isActive}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}