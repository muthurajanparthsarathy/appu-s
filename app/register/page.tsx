import Link from 'next/link';
import { redirect } from 'next/navigation';
import { register } from '@/app/actions/auth';
import { ActionForm, Field } from '@/app/components/forms';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { isDatabaseMode } from '@/app/server/config';
import { getCurrentUser } from '@/app/server/session';
import { PASSWORD_MIN } from '@/app/server/password';
import { safeNextPath } from '@/app/server/validation';
export const metadata = { title: 'Create account' };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Creating an account"/>;
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return <main className="wrap auth-page"><section className="auth-card">
    <span className="eyebrow">A FRESH START</span><h1>Create your account</h1>
    <ActionForm action={register} submitLabel="Create account" pendingLabel="Creating account…">
      <input type="hidden" name="next" value={next}/>
      <Field name="name" label="Full name" required autoComplete="name" maxLength={80}/>
      <Field name="email" label="Email" type="email" required autoComplete="email" inputMode="email" maxLength={254}/>
      <Field name="phone" label="Mobile number (optional)" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={16} hint="Used by our delivery partner to reach you."/>
      <Field name="password" label="Password" type="password" required autoComplete="new-password" maxLength={128} hint={`At least ${PASSWORD_MIN} characters.`}/>
    </ActionForm>
    <p className="auth-switch">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
  </section></main>;
}
