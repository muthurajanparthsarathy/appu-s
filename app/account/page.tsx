import Link from 'next/link';
import { MapPin, PackageCheck, ShieldCheck, UserRound } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { isDatabaseMode } from '@/app/server/config';
import { requireUser } from '@/app/server/session';
export const metadata = { title: 'Your account' };
export default async function Account() {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Your account"/>;
  const user = await requireUser('/account');
  return <main className="wrap account-page">
    <div className="account-hero"><UserRound size={40}/><div><span className="eyebrow">YOUR ACCOUNT</span><h1>Hello, {user.name}</h1><p className="muted">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p></div></div>
    <div className="account-grid">
      <Link href="/account/orders" className="account-tile"><PackageCheck size={28}/><strong>My orders</strong><small>Track, pay or cancel orders</small></Link>
      <Link href="/account/addresses" className="account-tile"><MapPin size={28}/><strong>Addresses</strong><small>Manage delivery addresses</small></Link>
      {user.role === 'ADMIN' && <Link href="/admin" className="account-tile"><ShieldCheck size={28}/><strong>Store admin</strong><small>Orders, products and pincodes</small></Link>}
    </div>
    <form action={logout}><button className="button secondary" type="submit">Sign out</button></form>
  </main>;
}
