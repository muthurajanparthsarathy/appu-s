import { Listing } from '@/app/components/Listing';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Everyday offers' };
export default async function Offers({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) { const { page, ...query } = await searchParams; return <Listing title="Little savings. Every day." query={{ ...query, offers: true }} page={page}/>; }
