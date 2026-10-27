import { Shield, Lock, Eye, Server } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="nb-h2 mb-2">
          Privacy.
        </h1>
        <p className="nb-body" style={{ opacity: 0.7 }}>
          Your data stays on your device. Period.
        </p>
      </div>

      <div className="space-y-6">
        {/* Main teal accent band */}
        <section
          className="p-8"
          style={{
            backgroundColor: 'var(--color-teal)',
            border: '3px solid var(--color-ink)',
            borderRadius: '24px',
            boxShadow: '8px 8px 0 var(--color-ink)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Lock size={22} style={{ color: 'var(--color-ink)' }} />
            <h2 className="nb-h3">No Data Collection</h2>
          </div>
          <p className="nb-body leading-relaxed font-medium" style={{ color: 'var(--color-ink)' }}>
            QRLink does not collect, store, or transmit any of your data. There are no analytics, no tracking pixels, 
            no cookies, and no third-party services. The application is a static website that runs entirely in your browser.
          </p>
        </section>

        {/* What happens to your URLs */}
        <section className="nb-box p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={18} style={{ color: 'var(--color-ink)' }} />
            <h2 className="nb-h3">Your URLs Stay Local</h2>
          </div>
          <p className="nb-body leading-relaxed mb-4" style={{ opacity: 0.8 }}>
            When you paste a URL into QRLink:
          </p>
          <ul className="space-y-2 nb-body" style={{ opacity: 0.8 }}>
            <li className="flex items-start gap-2">
              <span className="font-bold" style={{ color: 'var(--color-ink)' }}>✓</span>
              The URL is processed entirely in your browser's JavaScript runtime
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" style={{ color: 'var(--color-ink)' }}>✓</span>
              The QR code is generated locally using the qr-code-styling library
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" style={{ color: 'var(--color-ink)' }}>✓</span>
              Your history is stored in your browser's localStorage only
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" style={{ color: 'var(--color-ink)' }}>✓</span>
              No network requests are made after the page loads
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" style={{ color: 'var(--color-orange)' }}>✗</span>
              No URLs are sent to any server
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" style={{ color: 'var(--color-orange)' }}>✗</span>
              No QR codes are stored remotely
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" style={{ color: 'var(--color-orange)' }}>✗</span>
              No analytics or usage data is collected
            </li>
          </ul>
        </section>

        {/* Local Storage */}
        <section className="nb-box p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server size={18} style={{ color: 'var(--color-ink)' }} />
            <h2 className="nb-h3">Local Storage Usage</h2>
          </div>
          <p className="nb-body leading-relaxed mb-4" style={{ opacity: 0.8 }}>
            QRLink uses your browser's localStorage for two purposes:
          </p>
          <div className="space-y-3">
            <div
              className="p-4"
              style={{
                backgroundColor: 'var(--color-bg)',
                border: '3px solid var(--color-ink)',
                borderRadius: '12px',
              }}
            >
              <p className="text-xs nb-mono font-bold mb-1" style={{ color: 'var(--color-ink)' }}>qrlink_history</p>
              <p className="text-xs font-medium" style={{ color: 'var(--color-ink)', opacity: 0.7 }}>
                Stores up to 50 recent QR code generations (URL, platform, timestamp, style settings). 
                Used to avoid duplicates and provide quick re-access.
              </p>
            </div>
            <div
              className="p-4"
              style={{
                backgroundColor: 'var(--color-bg)',
                border: '3px solid var(--color-ink)',
                borderRadius: '12px',
              }}
            >
              <p className="text-xs nb-mono font-bold mb-1" style={{ color: 'var(--color-ink)' }}>qrlink_settings</p>
              <p className="text-xs font-medium" style={{ color: 'var(--color-ink)', opacity: 0.7 }}>
                Stores your preferred style settings (colors, dot style, corner style, export size) 
                so they persist between sessions.
              </p>
            </div>
          </div>
          <p className="nb-body mt-4" style={{ opacity: 0.8 }}>
            You can clear all stored data at any time by clearing your browser data, or using the 
            "Clear All" button on the History page.
          </p>
        </section>

        {/* Open source */}
        <section className="nb-box p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} style={{ color: 'var(--color-ink)' }} />
            <h2 className="nb-h3">Verify It Yourself</h2>
          </div>
          <p className="nb-body leading-relaxed" style={{ opacity: 0.8 }}>
            QRLink is a fully client-side application. You can verify this by opening your browser's 
            developer tools (F12), navigating to the Network tab, and confirming that no requests are 
            made after the initial page load. All processing happens in your browser's JavaScript engine. 
            There is no server, no API, no database — just code running locally.
          </p>
        </section>
      </div>
    </div>
  );
}
