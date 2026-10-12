import Link from 'next/link';
import { deleteAddress, setDefaultAddress } from '@/app/actions/account';
import { AddressForm } from '@/app/components/AddressForm';
import { ActionButton } from '@/app/components/forms';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { isDatabaseMode } from '@/app/server/config';
import { db } from '@/app/server/db';
import { requireUser } from '@/app/server/session';
import { safeNextPath } from '@/app/server/validation';
export const metadata = { title: 'Addresses' };
export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Saved addresses"/>;
  const user = await requireUser('/account/addresses');
  const next = (await searchParams).next;
  const addresses = await db().address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  return <main className="wrap account-page">
    <div className="breadcrumb"><Link href="/account">Account</Link> / Addresses</div>
    <h1>Delivery addresses</h1>
    {next && <p><Link className="text-link" href={safeNextPath(next, '/checkout')}>← Back to checkout</Link></p>}
    {addresses.length > 0 && <ul className="address-list">{addresses.map(address => <li key={address.id} className="panel">
      <p className="address-block"><strong>{address.fullName}</strong>{address.isDefault && <span className="badge">Default</span>}<br/>{address.line1}{address.line2 && <><br/>{address.line2}</>}{address.landmark && <><br/>Near {address.landmark}</>}<br/>{address.city} {address.pincode}<br/>📞 {address.phone}</p>
      <div className="row-actions">
        {!address.isDefault && <ActionButton action={setDefaultAddress.bind(null, address.id)} label="Make default" className="button small secondary"/>}
        <ActionButton action={deleteAddress.bind(null, address.id)} label="Delete" className="button small danger" confirmText="Delete this address?"/>
      </div>
    </li>)}</ul>}
    <section className="panel"><h2>Add a new address</h2><AddressForm next={next ? safeNextPath(next, '/checkout') : undefined}/></section>
  </main>;
}
