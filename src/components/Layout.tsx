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
      <header className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <div
            className="flex items-center justify-between px-4 sm:px-5 py-3"
            style={{
              background: 'var(--color-paper)',
              border: '3px solid var(--color-ink)',
              borderRadius: '16px',
              boxShadow: '4px 4px 0 var(--color-ink)',
            }}
          >
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black rounded-lg">
              <div
                className="w-10 h-10 flex items-center justify-center transition-transform group-hover:rotate-6"
                style={{
                  backgroundColor: 'var(--color-lime)',
                  border: '3px solid var(--color-ink)',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0 var(--color-ink)',
                }}
              >
                <QrCode size={20} color="var(--color-ink)" strokeWidth={2.5} />
              </div>
              <span 
                className="font-extrabold text-xl tracking-tight" 
                style={{ 
                  color: 'var(--color-ink)', 
                  fontFamily: "'Bricolage Grotesque', sans-serif" 
                }}
              >
                QRLink
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm transition-all duration-100 active:translate-x-0.5 active:translate-y-0.5"
                    style={{
                      color: 'var(--color-ink)',
                      backgroundColor: active ? 'var(--color-lime)' : 'transparent',
                      border: active ? '3px solid var(--color-ink)' : '3px solid transparent',
                      boxShadow: active ? '3px 3px 0 var(--color-ink)' : 'none',
                      borderRadius: '10px',
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: active ? 700 : 600,
                    }}
                  >
                    <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Bar */}
        <div className="md:hidden max-w-7xl mx-auto px-4 mt-3">
          <div
            className="flex overflow-x-auto gap-2 p-2 scrollbar-none snap-x"
            style={{
              background: 'var(--color-paper)',
              border: '3px solid var(--color-ink)',
              borderRadius: '14px',
              boxShadow: '4px 4px 0 var(--color-ink)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {navItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs min-h-[44px] shrink-0 snap-start transition-all active:scale-95"
                  style={{
                    color: 'var(--color-ink)',
                    backgroundColor: active ? 'var(--color-lime)' : 'transparent',
                    border: active ? '2.5px solid var(--color-ink)' : '2.5px solid transparent',
                    boxShadow: active ? '2px 2px 0 var(--color-ink)' : 'none',
                    borderRadius: '10px',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: active ? 700 : 600,
                  }}
                >
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 text-center mt-auto">
        <div 
          className="inline-block px-4 py-2 border-2 border-black/10 rounded-xl"
          style={{ background: 'var(--color-paper)' }}
        >
          <p 
            className="text-xs sm:text-sm font-bold tracking-wide" 
            style={{ 
              color: 'var(--color-ink)', 
              fontFamily: "'Bricolage Grotesque', sans-serif" 
            }}
          >
            100% client-side. No data leaves your browser.
          </p>
        </div>
      </footer>
    </div>
  );
}