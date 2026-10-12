import { Listing } from '@/app/components/Listing';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shop groceries' };
export default async function Shop({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) { const { page, ...query } = await searchParams; return <Listing title={query.q ? `Search: ${query.q}` : undefined} query={query} page={page}/>; }
