import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkle } from 'lucide-react';
import { AuthShell } from '@/app/components/AuthShell';
import { RegisterForm } from '@/app/components/AuthForms';
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
  return <AuthShell variant="register">
    <p className="auth-brandline"><Sparkle size={13} aria-hidden="true"/> Appu’s Mart · Coimbatore</p>
    <span className="auth-tag">Join the Heritage Pantry</span>
    <h1>Begin Your Heritage Journey</h1>
    <p className="auth-lead">Create an account to order Appu rice, oils, ghee and appalam, and track every delivery.</p>
    <RegisterForm next={next} passwordMin={PASSWORD_MIN}/>
    <p className="auth-switch-row">Already have an account?<Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in here</Link></p>
  </AuthShell>;
}
