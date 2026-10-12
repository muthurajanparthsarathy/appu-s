'use client';
import { createContext, useContext, useId, useRef, useState, type ReactNode } from 'react';
import type { ActionResult } from '@/app/lib/types';

type Result = Exclude<ActionResult, void>;
const FieldErrorsContext = createContext<Record<string, string>>({});

// Submits FormData to a server action and renders its result. Inputs keep their values after a failed submit.
export function ActionForm({ action, submitLabel, pendingLabel = 'Saving…', children, className = 'stack-form', resetOnSuccess = false, submitClassName = 'button' }: {
  action: (formData: FormData) => Promise<ActionResult>; submitLabel: string; pendingLabel?: string; children: ReactNode; className?: string; resetOnSuccess?: boolean; submitClassName?: string;
}) {
  const [result, setResult] = useState<Result>({});
  const [pending, setPending] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return <form ref={form} className={className} noValidate onSubmit={async event => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const outcome = await action(new FormData(event.currentTarget)) ?? {};
      setResult(outcome);
      if (outcome.ok && resetOnSuccess) form.current?.reset();
    } catch (error) {
      setResult({ error: 'Something went wrong. Please try again.' });
      console.error(error);
    } finally { setPending(false); }
  }}>
    {result.error && <div className="form-alert" role="alert">{result.error}</div>}
    {result.ok && <div className="form-success" role="status">{result.ok}</div>}
    <FieldErrorsContext.Provider value={result.fieldErrors ?? {}}>{children}</FieldErrorsContext.Provider>
    <button className={submitClassName} type="submit" disabled={pending}>{pending ? pendingLabel : submitLabel}</button>
  </form>;
}

type FieldProps = {
  name: string; label: string; type?: string; defaultValue?: string | number; required?: boolean; autoComplete?: string; placeholder?: string;
  hint?: string; inputMode?: 'numeric' | 'decimal' | 'tel' | 'email' | 'text'; maxLength?: number; multiline?: boolean; options?: { value: string; label: string }[];
};

export function Field({ name, label, type = 'text', defaultValue, required, autoComplete, placeholder, hint, inputMode, maxLength, multiline, options }: FieldProps) {
  const id = useId();
  const error = useContext(FieldErrorsContext)[name];
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const common = { id, name, required, defaultValue, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };
  return <div className="field">
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {options ? <select {...common}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : multiline ? <textarea {...common} rows={4} maxLength={maxLength} placeholder={placeholder}/>
      : <input {...common} type={type} autoComplete={autoComplete} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength}/>}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <small id={`${id}-error`} className="field-error">{error}</small>}
  </div>;
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return <label className="checkbox"><input type="checkbox" name={name} defaultChecked={defaultChecked}/> {label}</label>;
}

// One-click server action (cancel, set default, advance status) with an optional confirmation prompt.
export function ActionButton({ action, label, pendingLabel = 'Working…', confirmText, className = 'button small' }: { action: () => Promise<ActionResult>; label: string; pendingLabel?: string; confirmText?: string; className?: string }) {
  const [result, setResult] = useState<Result>({});
  const [pending, setPending] = useState(false);
  return <span className="action-button">
    <button type="button" className={className} disabled={pending} onClick={async () => {
      if (confirmText && !window.confirm(confirmText)) return;
      setPending(true);
      try { setResult(await action() ?? {}); }
      catch (error) { console.error(error); setResult({ error: 'Something went wrong. Please try again.' }); }
      finally { setPending(false); }
    }}>{pending ? pendingLabel : label}</button>
    {result.error && <small className="field-error" role="alert">{result.error}</small>}
    {result.ok && <small className="field-ok" role="status">{result.ok}</small>}
  </span>;
}
