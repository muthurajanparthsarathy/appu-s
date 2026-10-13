'use client';
import { useId, useState, type ReactNode } from 'react';
import { ArrowRight, AtSign, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react';
import { login, register } from '@/app/actions/auth';
import { ActionForm, useFieldError } from './forms';

type AuthFieldProps = {
  name: string; label: string; type?: 'text' | 'email' | 'tel' | 'password'; icon?: ReactNode; trailingIcon?: ReactNode;
  required?: boolean; optional?: boolean; autoComplete?: string; placeholder?: string; inputMode?: 'text' | 'tel' | 'email';
  autoCapitalize?: 'none' | 'words'; maxLength?: number; hint?: string; aside?: ReactNode; note?: ReactNode;
};

// Field with an icon on either side. Password fields get a show/hide button in place of the trailing icon.
function AuthField({ name, label, type = 'text', icon, trailingIcon, required, optional, autoComplete, placeholder, inputMode, autoCapitalize, maxLength, hint, aside, note }: AuthFieldProps) {
  const id = useId();
  const error = useFieldError(name);
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="auth-field">
    <div className="auth-label-row">
      <label htmlFor={id}>{label}{optional && <span className="auth-optional">optional</span>}</label>
      {aside}
    </div>
    <div className={`auth-input${icon ? ' lead' : ''}${isPassword || trailingIcon ? ' trail' : ''}`} data-invalid={error ? '' : undefined}>
      {icon && <span className="auth-icon" aria-hidden="true">{icon}</span>}
      <input id={id} name={name} type={isPassword && visible ? 'text' : type} required={required} autoComplete={autoComplete} placeholder={placeholder}
        inputMode={inputMode} autoCapitalize={autoCapitalize} spellCheck={false} maxLength={maxLength} aria-invalid={error ? true : undefined} aria-describedby={describedBy}/>
      {isPassword
        ? <button type="button" className="auth-eye" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
        : trailingIcon && <span className="auth-trail" aria-hidden="true">{trailingIcon}</span>}
    </div>
    {hint && <small id={`${id}-hint`} className="auth-hint">{hint}</small>}
    {error && <small id={`${id}-error`} className="auth-error">{error}</small>}
    {note}
  </div>;
}

export function LoginForm({ next }: { next: string }) {
  const [forgot, setForgot] = useState(false);
  const noteId = useId();
  return <ActionForm action={login} className="auth-form" submitClassName="auth-submit" pendingLabel="Signing in…"
    submitLabel={<>Sign In to Your Pantry <ArrowRight size={20} aria-hidden="true"/></>}>
    <input type="hidden" name="next" value={next}/>
    <AuthField name="identifier" label="Email or mobile number" required autoComplete="username" autoCapitalize="none" placeholder="you@mail.com or mobile" trailingIcon={<AtSign size={20}/>}/>
    <AuthField name="password" label="Password" type="password" required autoComplete="current-password" maxLength={128} placeholder="Enter your password"
      aside={<button type="button" className="auth-link" aria-expanded={forgot} aria-controls={noteId} onClick={() => setForgot(open => !open)}>Forgot password?</button>}
      note={forgot && <p id={noteId} className="auth-note">Online password reset isn’t available yet. Please contact Appu’s Mart and we’ll help you get back into your account.</p>}/>
    <label className="auth-check"><input type="checkbox" name="remember"/><span>Remember this device for 30 days</span></label>
  </ActionForm>;
}

export function RegisterForm({ next, passwordMin }: { next: string; passwordMin: number }) {
  return <ActionForm action={register} className="auth-form" submitClassName="auth-submit" pendingLabel="Creating account…"
    submitLabel={<>Create Heritage Account <ArrowRight size={20} aria-hidden="true"/></>}>
    <input type="hidden" name="next" value={next}/>
    <AuthField name="name" label="Full Name" required autoComplete="name" autoCapitalize="words" maxLength={80} placeholder="e.g. Ananya Raman" icon={<User size={20}/>}/>
    <AuthField name="email" label="Email Address" type="email" required autoComplete="email" autoCapitalize="none" inputMode="email" maxLength={254} placeholder="e.g. ananya@mail.com" icon={<Mail size={20}/>}/>
    <AuthField name="phone" label="Mobile Number" optional type="tel" autoComplete="tel-national" inputMode="tel" maxLength={16} placeholder="e.g. 98450 12345" icon={<Phone size={20}/>}
      hint="Lets you sign in with your mobile number too, and helps our delivery partner reach you."/>
    <AuthField name="password" label="Password" type="password" required autoComplete="new-password" maxLength={128} placeholder="Create a password" icon={<Lock size={20}/>}
      hint={`At least ${passwordMin} characters.`}/>
  </ActionForm>;
}
