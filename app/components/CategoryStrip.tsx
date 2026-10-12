import Link from 'next/link';
import type { Category } from '@/app/lib/types';
export function CategoryStrip({ categories }: { categories: Category[] }) { return <div className="category-strip">{categories.map(category => <Link href={`/category/${category.slug}`} key={category.slug}><span className="category-icon" aria-hidden="true">{category.icon}</span><span>{category.name}</span></Link>)}</div>; }
