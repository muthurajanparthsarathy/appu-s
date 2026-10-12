import { isDatabaseMode } from '@/app/server/config';
import { DEFAULT_SERVICE_AREA, DEFAULT_SERVICE_PINCODES, isPincode } from '@/app/server/delivery';
import { json } from '@/app/server/request';

export async function GET(request: Request) {
  const pincode = new URL(request.url).searchParams.get('pincode')?.trim();
  if (!isPincode(pincode)) return json({ error: 'Enter a valid 6-digit pincode.' }, 400);
  if (!isDatabaseMode()) return json({ pincode, serviceable: DEFAULT_SERVICE_PINCODES.includes(pincode), area: DEFAULT_SERVICE_AREA });
  try {
    const area = await (await import('@/app/server/db')).db().serviceArea.findUnique({ where: { pincode } });
    return json({ pincode, serviceable: Boolean(area?.active), area: area?.area ?? null });
  } catch { return json({ error: 'Delivery check is temporarily unavailable.' }, 503); }
}
