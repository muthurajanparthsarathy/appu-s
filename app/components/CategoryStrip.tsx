import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/app/lib/types';
// Category photo when the catalogue has one; emoji only as a fallback for categories added without a photo.
export function CategoryThumb({ category, size }: { category: Category; size: number }) {
  return category.imageUrl
    ? <Image src={category.imageUrl} alt="" width={size} height={size} quality={90} className="category-thumb"/>
    : <span className="category-thumb" aria-hidden="true">{category.icon}</span>;
}
export function CategoryStrip({ categories }: { categories: Category[] }) { return <div className="category-strip">{categories.map(category => <Link href={`/category/${category.slug}`} key={category.slug}><span className="category-icon" aria-hidden="true">{category.imageUrl ? <Image src={category.imageUrl} alt="" width={80} height={80} quality={90}/> : category.icon}</span><span>{category.name}</span></Link>)}</div>; }
