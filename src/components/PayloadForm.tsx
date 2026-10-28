import type { PayloadType, PayloadField } from '../lib/payloads';
import { Dropdown } from './Dropdown';

interface PayloadFormProps {
  type: PayloadType;
  values: Record<string, string | boolean>;
  errors: Record<string, string>;
  hints?: Record<string, string>;
  onChange: (fieldId: string, value: string | boolean) => void;
}

export function PayloadForm({ type, values, errors, hints, onChange }: PayloadFormProps) {
  return (
    <div className="space-y-4">
      {type.fields.map(field => (
        <FormField
          key={field.id}
          field={field}
          value={values[field.id] ?? ''}
          error={errors[field.id]}
          hint={hints?.[field.id]}
          onChange={(value) => onChange(field.id, value)}
        />
      ))}
    </div>
  );
}

interface FormFieldProps {
  field: PayloadField;
  value: string | boolean;
  error?: string;
  hint?: string;
  onChange: (value: string | boolean) => void;
}

function FormField({ field, value, error, hint, onChange }: FormFieldProps) {
  const inputId = `field-${field.id}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const baseInputStyle = {
    backgroundColor: 'var(--color-paper)',
    border: `3px solid ${error ? 'var(--color-pink)' : 'var(--color-ink)'}`,
    borderRadius: '12px',
    boxShadow: error ? '4px 4px 0 var(--color-pink)' : '4px 4px 0 var(--color-ink)',
    color: 'var(--color-ink)',
    fontFamily: field.type === 'url' || field.type === 'email' || field.type === 'tel' ? "'JetBrains Mono', monospace" : "'DM Sans', sans-serif",
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block mb-2 text-sm font-bold"
        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: 'var(--color-ink)' }}
      >
        {field.label}
        {field.required && <span style={{ color: 'var(--color-orange)' }}> *</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          id={inputId}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          rows={4}
          className="w-full p-3 text-sm outline-none transition-all duration-150 resize-y"
          style={baseInputStyle}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={!!error}
        />
      ) : field.type === 'select' ? (
        <Dropdown
          id={inputId}
          value={String(value)}
          options={field.options || []}
          onChange={(val) => onChange(val)}
          error={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={!!error}
        />
      ) : field.type === 'checkbox' ? (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            id={inputId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 cursor-pointer"
            style={{
              accentColor: 'var(--color-lime)',
              border: '2px solid var(--color-ink)',
            }}
            aria-describedby={hint ? hintId : undefined}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {field.label}
          </span>
        </label>
      ) : (
        <input
          id={inputId}
          type={field.type}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full p-3 text-sm outline-none transition-all duration-150"
          style={baseInputStyle}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={!!error}
        />
      )}

      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-2 px-3 py-2 text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-pink)',
            color: 'var(--color-ink)',
            border: '3px solid var(--color-ink)',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      {hint && !error && (
        <div
          id={hintId}
          className="mt-2 px-3 py-2 text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-lime)',
            color: 'var(--color-ink)',
            border: '3px solid var(--color-ink)',
            borderRadius: '8px',
          }}
        >
          {hint}
        </div>
      )}

      {field.hint && !hint && !error && (
        <p className="mt-1 text-xs font-medium" style={{ color: 'var(--color-ink)', opacity: 0.6 }}>
          {field.hint}
        </p>
      )}
    </div>
  );
}
