'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionResult } from '@/app/lib/types';
import { db } from '@/app/server/db';
import { getCurrentUser } from '@/app/server/session';
import { cancelOrderAsCustomer } from '@/app/server/orders';
import { parseAddress, safeNextPath } from '@/app/server/validation';

const signedOut = { error: 'Your session has ended. Please sign in again.' };
const MAX_ADDRESSES = 10;

export async function saveAddress(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const parsed = parseAddress(Object.fromEntries(formData));
  if (!parsed.ok) return { error: 'Please fix the highlighted details.', fieldErrors: parsed.errors };
  const area = await db().serviceArea.findUnique({ where: { pincode: parsed.data.pincode } });
  if (!area?.active) return { error: `We don’t deliver to ${parsed.data.pincode} yet. We currently deliver in Coimbatore.`, fieldErrors: { pincode: 'Not serviceable yet.' } };
  const client = db();
  const count = await client.address.count({ where: { userId: user.id } });
  if (count >= MAX_ADDRESSES) return { error: `You can save up to ${MAX_ADDRESSES} addresses. Delete one first.` };
  const makeDefault = count === 0 || formData.get('isDefault') === 'on';
  await client.$transaction(async tx => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.create({ data: { ...parsed.data, userId: user.id, isDefault: makeDefault } });
  });
  revalidatePath('/account/addresses');
  revalidatePath('/checkout');
  redirect(safeNextPath(formData.get('next'), '/account/addresses'));
}

export async function deleteAddress(addressId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const client = db();
  const removed = await client.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!removed) return { error: 'Address not found.' };
  await client.$transaction(async tx => {
    await tx.address.delete({ where: { id: removed.id } });
    if (removed.isDefault) {
      const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  revalidatePath('/account/addresses');
  return { ok: 'Address removed.' };
}

export async function setDefaultAddress(addressId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const client = db();
  if (!await client.address.findFirst({ where: { id: addressId, userId: user.id } })) return { error: 'Address not found.' };
  await client.$transaction([
    client.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    client.address.update({ where: { id: addressId }, data: { isDefault: true } })
  ]);
  revalidatePath('/account/addresses');
  return { ok: 'Default address updated.' };
}

export async function cancelMyOrder(orderId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const cancelled = await cancelOrderAsCustomer(user.id, orderId);
  revalidatePath(`/account/orders/${orderId}`);
  return cancelled ? { ok: 'Your order has been cancelled.' } : { error: 'This order can no longer be cancelled. Please contact support.' };
}
