import Link from 'next/link';
import { ProductForm } from '@/app/components/ProductForm';
import { getCategories } from '@/app/server/catalog';
import { requireAdmin } from '@/app/server/session';
export const metadata = { title: 'New product' };
export default async function NewProduct() {
  await requireAdmin();
  return <>
    <div className="breadcrumb"><Link href="/admin/products">Products</Link> / New</div>
    <h1>New product</h1>
    <section className="panel"><ProductForm categories={await getCategories()}/></section>
  </>;
}
