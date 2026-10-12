import { saveAddress } from '@/app/actions/account';
import { ActionForm, Checkbox, Field } from './forms';
export function AddressForm({ next }: { next?: string }) {
  return <ActionForm action={saveAddress} submitLabel="Save address" className="stack-form address-form">
    {next && <input type="hidden" name="next" value={next}/>}
    <div className="form-grid">
      <Field name="fullName" label="Full name" required autoComplete="name" maxLength={80}/>
      <Field name="phone" label="Mobile number" required type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" maxLength={16}/>
    </div>
    <Field name="line1" label="House / flat no., street" required autoComplete="address-line1" maxLength={160}/>
    <Field name="line2" label="Area / locality" autoComplete="address-line2" maxLength={160}/>
    <div className="form-grid">
      <Field name="landmark" label="Landmark" maxLength={80}/>
      <Field name="city" label="City" required defaultValue="Coimbatore" autoComplete="address-level2" maxLength={60}/>
      <Field name="pincode" label="Pincode" required inputMode="numeric" autoComplete="postal-code" maxLength={6} hint="We deliver to Coimbatore pincodes."/>
    </div>
    <Checkbox name="isDefault" label="Make this my default address"/>
  </ActionForm>;
}
