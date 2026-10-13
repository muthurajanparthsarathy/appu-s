import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/app/components/AuthShell';
import { LoginForm } from '@/app/components/AuthForms';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { isDatabaseMode } from '@/app/server/config';
import { getCurrentUser } from '@/app/server/session';
import { safeNextPath } from '@/app/server/validation';
export const metadata = { title: 'Sign in' };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Signing in"/>;
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return <AuthShell variant="login">
    <span className="auth-tag">Patron Sanctuary</span>
    <h1>Welcome Back to Pure Living</h1>
    <p className="auth-lead">Sign in to access your orders, saved addresses and basket.</p>
    <LoginForm next={next}/>
    <p className="auth-switch-row">Don’t have an account?<Link href={`/register?next=${encodeURIComponent(next)}`}>Sign up here</Link></p>
  </AuthShell>;
}
