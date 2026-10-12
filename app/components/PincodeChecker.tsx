'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MapPin, XCircle } from 'lucide-react';

const STORAGE_KEY = 'veenamart.pincode';
type Check = { pincode: string; serviceable: boolean; area: string | null } | { error: string };

// Lets shoppers check delivery coverage before they sign up; the remembered pincode is display-only.
export function PincodeChecker() {
  const [pincode, setPincode] = useState('641001');
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<Check | null>(null);
  const [pending, setPending] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved && /^[1-9]\d{5}$/.test(saved)) setPincode(saved); } catch { /* storage unavailable */ } }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', close); document.addEventListener('mousedown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('mousedown', close); };
  }, [open]);
  return <div className="location" ref={panel}>
    <button type="button" className="location-button" aria-expanded={open} aria-controls="pincode-panel" onClick={() => setOpen(value => !value)}>
      <MapPin size={23}/><span><small>Deliver to</small><strong>Coimbatore · {pincode}</strong></span>
    </button>
    {open && <div className="pincode-panel" id="pincode-panel">
      <form onSubmit={async event => {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget).get('pincode') ?? '').trim();
        setPending(true);
        try {
          const response = await fetch(`/api/serviceability?pincode=${encodeURIComponent(value)}`);
          const data = await response.json();
          setCheck(response.ok ? data : { error: data.error ?? 'Could not check this pincode.' });
          if (response.ok && data.serviceable) { setPincode(value); try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ } }
        } catch { setCheck({ error: 'Could not check this pincode. Please try again.' }); }
        finally { setPending(false); }
      }}>
        <label htmlFor="pincode-input"><strong>Check delivery to your pincode</strong></label>
        <div className="pincode-row"><input id="pincode-input" name="pincode" inputMode="numeric" maxLength={6} defaultValue={pincode} autoFocus/><button className="button small" disabled={pending}>{pending ? 'Checking…' : 'Check'}</button></div>
      </form>
      <div aria-live="polite">{check && ('error' in check ? <p className="field-error">{check.error}</p>
        : check.serviceable ? <p className="field-ok"><CheckCircle2 size={15}/> We deliver to {check.pincode}{check.area ? ` (${check.area})` : ''}.</p>
        : <p className="field-error"><XCircle size={15}/> We don’t deliver to {check.pincode} yet. We’re starting in Coimbatore.</p>)}</div>
    </div>}
  </div>;
}
