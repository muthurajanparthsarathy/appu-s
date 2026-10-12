import Link from 'next/link';
import { Database } from 'lucide-react';
// Shown in demo mode for features that need PostgreSQL (accounts, checkout, admin).
export function DatabaseRequired({ feature }: { feature: string }) {
  return <main className="wrap empty-state"><Database size={42}/><span className="eyebrow">DEMO MODE</span><h1>{feature} needs the database</h1><p>This store is running on demo catalog data. Start PostgreSQL and set <code>CATALOG_SOURCE=database</code><br/>(see README → Database mode) to enable accounts, checkout and admin.</p><Link href="/shop" className="button">Keep browsing →</Link></main>;
}
