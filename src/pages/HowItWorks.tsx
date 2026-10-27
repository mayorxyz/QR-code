import { BookOpen, Cpu, Shield, Zap } from 'lucide-react';

export function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="nb-h2 mb-2">
          How It Works.
        </h1>
        <p className="nb-body" style={{ opacity: 0.7 }}>
          Understanding QR codes and how QRLink generates them.
        </p>
      </div>

      <div className="space-y-6">
        {/* What is a QR code */}
        <section className="nb-box p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 flex items-center justify-center font-bold text-lg"
              style={{
                backgroundColor: 'var(--color-orange)',
                color: '#fff',
                border: '3px solid var(--color-ink)',
                borderRadius: '10px',
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              01
            </div>
            <h2 className="nb-h3">What is a QR Code?</h2>
          </div>
          <p className="nb-body leading-relaxed" style={{ opacity: 0.8 }}>
            A QR (Quick Response) code is a two-dimensional barcode that can encode data in a grid of black and white modules. 
            Originally developed by Denso Wave in 1994 for tracking automotive parts, QR codes can store up to 4,296 alphanumeric 
            characters or 7,089 numeric characters. They are read by cameras and decoded using built-in patterns called finder patterns 
            (the three large squares in the corners) that help the scanner orient itself.
          </p>
        </section>

        {/* Error Correction */}
        <section className="nb-box p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 flex items-center justify-center font-bold text-lg"
              style={{
                backgroundColor: 'var(--color-orange)',
                color: '#fff',
                border: '3px solid var(--color-ink)',
                borderRadius: '10px',
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              02
            </div>
            <h2 className="nb-h3">Error Correction</h2>
          </div>
          <p className="nb-body leading-relaxed mb-4" style={{ opacity: 0.8 }}>
            QR codes include built-in error correction using Reed-Solomon codes. This means part of the code can be damaged 
            or obscured and still be scannable. There are four levels:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { level: 'L', recovery: '7%', desc: 'Maximum data capacity' },
              { level: 'M', recovery: '15%', desc: 'Default, good balance' },
              { level: 'Q', recovery: '25%', desc: 'Higher reliability' },
              { level: 'H', recovery: '30%', desc: 'Required for logo overlay' },
            ].map(ec => (
              <div
                key={ec.level}
                className="p-4"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '3px solid var(--color-ink)',
                  borderRadius: '12px',
                }}
              >
                <p className="text-sm font-bold nb-mono" style={{ color: 'var(--color-ink)' }}>Level {ec.level}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-ink)', opacity: 0.6 }}>{ec.recovery} recovery — {ec.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why it runs locally */}
        <section className="nb-box p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 flex items-center justify-center font-bold text-lg"
              style={{
                backgroundColor: 'var(--color-orange)',
                color: '#fff',
                border: '3px solid var(--color-ink)',
                borderRadius: '10px',
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              03
            </div>
            <h2 className="nb-h3">100% Client-Side</h2>
          </div>
          <p className="nb-body leading-relaxed" style={{ opacity: 0.8 }}>
            QRLink runs entirely in your browser. No data is sent to any server — your URLs, style preferences, and history 
            never leave your device. The QR code is generated using JavaScript in your browser's runtime. This means it works 
            offline, there are no rate limits, and your data remains private. The entire application is a static site that can 
            be hosted anywhere without a backend.
          </p>
        </section>

        {/* Scanning Tips */}
        <section className="nb-box p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} style={{ color: 'var(--color-ink)' }} />
            <h2 className="nb-h3">Scanning Tips</h2>
          </div>
          <ul className="space-y-3 nb-body" style={{ opacity: 0.8 }}>
            <li className="flex items-start gap-3">
              <span className="nb-badge flex-shrink-0" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>→</span>
              Keep the quiet zone (white border) around the QR code. Most scanners need it.
            </li>
            <li className="flex items-start gap-3">
              <span className="nb-badge flex-shrink-0" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>→</span>
              Higher contrast = better scanning. Black on white is optimal.
            </li>
            <li className="flex items-start gap-3">
              <span className="nb-badge flex-shrink-0" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>→</span>
              Longer URLs create denser codes. Use URL shorteners for very long links.
            </li>
            <li className="flex items-start gap-3">
              <span className="nb-badge flex-shrink-0" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>→</span>
              If adding a logo, use error correction level H (30%) to ensure the code still scans.
            </li>
            <li className="flex items-start gap-3">
              <span className="nb-badge flex-shrink-0" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>→</span>
              Print at minimum 1 inch (2.5 cm) square for reliable scanning from a phone.
            </li>
            <li className="flex items-start gap-3">
              <span className="nb-badge flex-shrink-0" style={{ backgroundColor: 'var(--color-lime)', color: 'var(--color-ink)' }}>→</span>
              Avoid inverting colors (light modules on dark background) — many scanners fail on these.
            </li>
          </ul>
        </section>

        {/* URL Pipeline */}
        <section className="nb-box p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} style={{ color: 'var(--color-ink)' }} />
            <h2 className="nb-h3">The URL Pipeline</h2>
          </div>
          <p className="nb-body leading-relaxed mb-4" style={{ opacity: 0.8 }}>
            Every URL goes through a multi-step pipeline before encoding:
          </p>
          <div className="space-y-2">
            {[
              { step: '1. Sanitize', desc: 'Trim, validate scheme, reject dangerous protocols' },
              { step: '2. Normalize', desc: 'Strip tracking params, sort query params, lowercase host' },
              { step: '3. Classify', desc: 'Detect platform (Facebook, X, YouTube, etc.)' },
              { step: '4. Dedupe', desc: 'Hash canonical URL + style to avoid duplicate history entries' },
              { step: '5. Generate', desc: 'Render QR code with selected style settings' },
              { step: '6. Export', desc: 'Download as PNG/SVG, copy to clipboard, or share' },
            ].map(item => (
              <div
                key={item.step}
                className="flex items-start gap-4 p-3"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '2px solid var(--color-ink)',
                  borderRadius: '10px',
                }}
              >
                <span className="text-xs font-bold nb-mono whitespace-nowrap" style={{ color: 'var(--color-ink)' }}>{item.step}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-ink)', opacity: 0.7 }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
