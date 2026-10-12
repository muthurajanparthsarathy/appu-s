import Link from 'next/link';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { isDatabaseMode } from '@/app/server/config';
import { requireAdmin } from '@/app/server/session';
export const metadata = { title: { default: 'Admin', template: '%s · Admin | Appu’s Mart' }, robots: { index: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Store admin"/>;
  const admin = await requireAdmin();
  return <div className="wrap admin-shell">
    <nav className="admin-nav" aria-label="Admin">
      <strong>Store admin</strong>
      <Link href="/admin">Dashboard</Link>
      <Link href="/admin/orders">Orders</Link>
      <Link href="/admin/products">Products</Link>
      <Link href="/admin/pincodes">Delivery pincodes</Link>
      <small className="muted">Signed in as {admin.email}</small>
    </nav>
    <div className="admin-main">{children}</div>
  </div>;
}
