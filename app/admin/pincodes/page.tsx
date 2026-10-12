import { addServiceArea, toggleServiceArea } from '@/app/actions/admin';
import { ActionButton, ActionForm, Field } from '@/app/components/forms';
import { db } from '@/app/server/db';
import { requireAdmin } from '@/app/server/session';
export const metadata = { title: 'Delivery pincodes' };
export default async function Pincodes() {
  await requireAdmin();
  const areas = await db().serviceArea.findMany({ orderBy: { pincode: 'asc' } });
  const active = areas.filter(a => a.active).length;
  return <>
    <h1>Delivery pincodes</h1>
    <p className="muted">{active} of {areas.length} pincodes accept orders. Paused pincodes keep their history; new checkouts to them are refused.</p>
    <section className="panel"><h2>Add or resume a pincode</h2>
      <ActionForm action={addServiceArea} submitLabel="Save pincode" className="stack-form inline-form" resetOnSuccess>
        <Field name="pincode" label="Pincode" required inputMode="numeric" maxLength={6}/>
        <Field name="area" label="Area name" required maxLength={60} defaultValue="Coimbatore"/>
      </ActionForm>
    </section>
    <div className="table-scroll"><table className="admin-table"><thead><tr><th>Pincode</th><th>Area</th><th>Status</th><th></th></tr></thead><tbody>
      {areas.map(area => <tr key={area.pincode}>
        <td><strong>{area.pincode}</strong></td><td>{area.area}</td>
        <td>{area.active ? <span className="badge status-confirmed">Delivering</span> : <span className="badge status-cancelled">Paused</span>}</td>
        <td><ActionButton action={toggleServiceArea.bind(null, area.pincode)} label={area.active ? 'Pause' : 'Resume'} className="button small secondary"/></td>
      </tr>)}
    </tbody></table></div>
  </>;
}
