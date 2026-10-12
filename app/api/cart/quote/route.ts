import { NextResponse } from 'next/server';
import { parseCart, calculateQuote } from '@/app/server/pricing';
import { getProductsByIds } from '@/app/server/catalog';
export async function POST(request: Request) {
  let lines;
  try {
    const raw = await request.text();
    if (raw.length > 10000) return NextResponse.json({ error: 'Cart payload is too large.' }, { status: 413 });
    lines = parseCart(JSON.parse(raw).items);
  } catch { return NextResponse.json({ error: 'Invalid cart. Quantities must be 1–20 with no duplicate products.' }, { status: 400 }); }
  let products;
  try { products = await getProductsByIds(lines.map(line => line.productId)); }
  catch { return NextResponse.json({ error: 'Catalog is temporarily unavailable.' }, { status: 503 }); }
  try { return NextResponse.json(calculateQuote(lines, products), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to price cart.' }, { status: 409 }); }
}
