import { NextResponse } from 'next/server';
import { getProductPage } from '@/app/server/catalog';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try { return NextResponse.json(await getProductPage({ category: params.get('category') ?? undefined, q: params.get('q') ?? undefined, sort: params.get('sort') ?? undefined, offers: params.get('offers') === '1' }, params.get('page'))); }
  catch { return NextResponse.json({ error: 'Catalog is temporarily unavailable.' }, { status: 503 }); }
}
