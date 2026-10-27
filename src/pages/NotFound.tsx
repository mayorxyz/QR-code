import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 text-center">
      <div
        className="inline-block p-10 mb-8"
        style={{
          backgroundColor: 'var(--color-purple)',
          border: '3px solid var(--color-ink)',
          borderRadius: '24px',
          boxShadow: '8px 8px 0 var(--color-ink)',
        }}
      >
        <span
          className="text-5xl font-bold block"
          style={{ color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          404
        </span>
      </div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
        Page Not Found.
      </h1>
      <p className="nb-body mb-8" style={{ opacity: 0.7 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="nb-btn-primary"
      >
        <Home size={16} />
        Back to Generator
      </Link>
    </div>
  );
}
