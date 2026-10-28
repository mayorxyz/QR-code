import { Link, useLocation } from 'react-router-dom';
import { QrCode, History, Layers, Shield, BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Generator', icon: QrCode },
    { to: '/bulk', label: 'Bulk', icon: Layers },
    { to: '/history', label: 'History', icon: History },
    { to: '/how-it-works', label: 'How It Works', icon: BookOpen },
    { to: '/privacy', label: 'Privacy', icon: Shield },
  ];

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Dot grid background */}
      <div
        className="fixed inset-0 pointer-events-none nb-dot-grid"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              background: 'var(--color-paper)',
              border: '3px solid var(--color-ink)',
              borderRadius: '16px',
              boxShadow: '6px 6px 0 var(--color-ink)',
            }}
          >
            <Link to="/" className="flex items-center gap-2.5 group">
              <div
                className="w-9 h-9 flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-lime)',
                  border: '3px solid var(--color-ink)',
                  borderRadius: '8px',
                }}
              >
                <QrCode size={18} color="#111" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                QRLink
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-all duration-150 ${active ? 'font-bold' : 'hover:opacity-70'}`}
                    style={{
                      color: 'var(--color-ink)',
                      backgroundColor: active ? 'var(--color-lime)' : 'transparent',
                      border: active ? '3px solid var(--color-ink)' : '3px solid transparent',
                      borderRadius: '10px',
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 mt-2">
          <div
            className="flex overflow-x-auto px-3 py-2 gap-1"
            style={{
              background: 'var(--color-paper)',
              border: '3px solid var(--color-ink)',
              borderRadius: '12px',
              boxShadow: '4px 4px 0 var(--color-ink)',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {navItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap transition-all duration-150 min-h-[44px]`}
                  style={{
                    color: 'var(--color-ink)',
                    backgroundColor: active ? 'var(--color-lime)' : 'transparent',
                    border: active ? '2px solid var(--color-ink)' : '2px solid transparent',
                    borderRadius: '8px',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center">
        <p className="text-sm font-bold" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          100% client-side. No data leaves your browser.
        </p>
      </footer>
    </div>
  );
}
