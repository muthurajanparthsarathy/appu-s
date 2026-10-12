import Link from 'next/link';
import { redirect } from 'next/navigation';
import { login } from '@/app/actions/auth';
import { ActionForm, Field } from '@/app/components/forms';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { isDatabaseMode } from '@/app/server/config';
import { getCurrentUser } from '@/app/server/session';
import { safeNextPath } from '@/app/server/validation';
export const metadata = { title: 'Sign in' };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Signing in"/>;
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return <main className="wrap auth-page"><section className="auth-card">
    <span className="eyebrow">WELCOME BACK</span><h1>Sign in to VeenaMart</h1>
    <ActionForm action={login} submitLabel="Sign in" pendingLabel="Signing in…">
      <input type="hidden" name="next" value={next}/>
      <Field name="email" label="Email" type="email" required autoComplete="email" inputMode="email" maxLength={254}/>
      <Field name="password" label="Password" type="password" required autoComplete="current-password" maxLength={128}/>
    </ActionForm>
    <p className="auth-switch">New here? <Link href={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
  </section></main>;
}
