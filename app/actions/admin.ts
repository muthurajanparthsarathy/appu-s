'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@/app/generated/prisma/client';
import type { ActionResult } from '@/app/lib/types';
import { parseRupeesToPaise } from '@/app/lib/money';
import { db } from '@/app/server/db';
import { getCurrentUser } from '@/app/server/session';
import { advanceOrder, cancelOrderAsAdmin, markRefunded } from '@/app/server/orders';
import { isPincode } from '@/app/server/delivery';
import { parseProduct } from '@/app/server/validation';

// Every admin action re-checks the role server-side; hiding buttons is not authorisation.
async function admin() {
  const user = await getCurrentUser();
  return user?.role === 'ADMIN' ? user : null;
}
const forbidden = { error: 'Admin access required. Please sign in again.' };

export async function saveProduct(productId: string | null, formData: FormData): Promise<ActionResult> {
  if (!await admin()) return forbidden;
  const parsed = parseProduct(Object.fromEntries(formData), parseRupeesToPaise);
  if (!parsed.ok) return { error: 'Please fix the highlighted fields.', fieldErrors: parsed.errors };
  const client = db();
  if (!await client.category.findUnique({ where: { slug: parsed.data.categorySlug } })) return { error: 'Choose a valid category.', fieldErrors: { categorySlug: 'Unknown category.' } };
  let created: { id: string } | null = null;
  try {
    if (!productId) created = await client.product.create({ data: parsed.data, select: { id: true } });
    else {
      // Stock moves with every order, so it is only written when the admin changed it, and only if it still holds
      // the value the form was loaded with (otherwise sales made meanwhile would be silently undone).
      const loadedStock = Number(formData.get('loadedStock'));
      if (!Number.isInteger(loadedStock)) return { error: 'This form is out of date. Reload the page and try again.' };
      const { stock, ...details } = parsed.data;
      if (stock === loadedStock) await client.product.update({ where: { id: productId }, data: details });
      else if ((await client.product.updateMany({ where: { id: productId, stock: loadedStock }, data: parsed.data })).count !== 1) {
        const current = await client.product.findUnique({ where: { id: productId }, select: { stock: true } });
        if (!current) return { error: 'This product no longer exists.' };
        return { error: `Stock changed to ${current.stock} while you were editing (orders or another admin). Nothing was saved — reload the page and enter the new stock again.`, fieldErrors: { stock: `Currently ${current.stock}.` } };
      }
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { error: 'Another product already uses this slug.', fieldErrors: { slug: 'Already in use.' } };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return { error: 'This product no longer exists.' };
    throw error;
  }
  revalidatePath('/admin/products');
  if (created) redirect(`/admin/products/${created.id}?saved=1`);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: 'Product saved.' };
}

export async function advanceOrderAction(orderId: string): Promise<ActionResult> {
  const user = await admin();
  if (!user) return forbidden;
  const done = await advanceOrder(String(orderId), `admin:${user.email}`);
  revalidatePath(`/admin/orders/${orderId}`);
  return done ? { ok: 'Order updated.' } : { error: 'The order changed in the meantime. Refresh and try again.' };
}

export async function cancelOrderAction(orderId: string, formData: FormData): Promise<ActionResult> {
  const user = await admin();
  if (!user) return forbidden;
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 200);
  if (reason.length < 3) return { error: 'Enter a short cancellation reason for the customer.' };
  const done = await cancelOrderAsAdmin(String(orderId), `admin:${user.email}`, reason);
  revalidatePath(`/admin/orders/${orderId}`);
  return done ? { ok: 'Order cancelled and stock restored.' } : { error: 'This order can no longer be cancelled.' };
}

export async function refundOrderAction(orderId: string, formData: FormData): Promise<ActionResult> {
  const user = await admin();
  if (!user) return forbidden;
  const reference = String(formData.get('reference') ?? '').trim().slice(0, 100);
  const done = await markRefunded(String(orderId), `admin:${user.email}`, reference);
  revalidatePath(`/admin/orders/${orderId}`);
  return done ? { ok: 'Refund recorded.' } : { error: 'No refund is due on this order.' };
}

export async function addServiceArea(formData: FormData): Promise<ActionResult> {
  if (!await admin()) return forbidden;
  const pincode = String(formData.get('pincode') ?? '').trim();
  const area = String(formData.get('area') ?? '').trim().slice(0, 60);
  if (!isPincode(pincode)) return { error: 'Enter a valid 6-digit pincode.', fieldErrors: { pincode: 'Invalid pincode.' } };
  if (area.length < 2) return { error: 'Enter the area name.', fieldErrors: { area: 'Required.' } };
  await db().serviceArea.upsert({ where: { pincode }, create: { pincode, area }, update: { area, active: true } });
  revalidatePath('/admin/pincodes');
  return { ok: `${pincode} is now serviceable.` };
}

export async function toggleServiceArea(pincode: string): Promise<ActionResult> {
  if (!await admin()) return forbidden;
  const area = isPincode(pincode) ? await db().serviceArea.findUnique({ where: { pincode } }) : null;
  if (!area) return { error: 'Pincode not found.' };
  await db().serviceArea.update({ where: { pincode }, data: { active: !area.active } });
  revalidatePath('/admin/pincodes');
  return { ok: `${pincode} ${area.active ? 'paused' : 'resumed'}.` };
}
