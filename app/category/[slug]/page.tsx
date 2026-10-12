import { notFound } from 'next/navigation';
import { getCategories } from '@/app/server/catalog';
import { Listing } from '@/app/components/Listing';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return { title: (await getCategories()).find(c => c.slug === slug)?.name ?? 'Category not found' }; }
export default async function Category({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  const { slug } = await params; const category = (await getCategories()).find(c => c.slug === slug);
  if (!category) notFound();
  const { page, ...query } = await searchParams;
  return <Listing title={category.name} query={{ ...query, category: slug }} page={page}/>;
}
