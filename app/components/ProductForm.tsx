import { saveProduct } from '@/app/actions/admin';
import type { Category } from '@/app/lib/types';
import { paiseToRupeesInput } from '@/app/lib/money';
import { ActionForm, Checkbox, Field } from './forms';

type Editable = { id: string; name: string; slug: string; categorySlug: string; brand: string; unit: string; pricePaise: number; mrpPaise: number; stock: number; icon: string; imageUrl: string | null; description: string; featured: boolean; active: boolean };

export function ProductForm({ product, categories }: { product?: Editable; categories: Category[] }) {
  return <ActionForm action={saveProduct.bind(null, product?.id ?? null)} submitLabel={product ? 'Save changes' : 'Create product'} className="stack-form product-form">
    {product && <input type="hidden" name="loadedStock" value={product.stock}/>}
    <div className="form-grid">
      <Field name="name" label="Name" required defaultValue={product?.name} maxLength={120}/>
      <Field name="slug" label="URL slug" defaultValue={product?.slug} maxLength={80} hint="Leave blank to generate from the name."/>
    </div>
    <div className="form-grid">
      <Field name="categorySlug" label="Category" required defaultValue={product?.categorySlug} options={categories.map(c => ({ value: c.slug, label: c.name }))}/>
      <Field name="brand" label="Brand" required defaultValue={product?.brand} maxLength={60}/>
      <Field name="unit" label="Pack size" required defaultValue={product?.unit} maxLength={30} placeholder="1 kg"/>
    </div>
    <div className="form-grid">
      <Field name="price" label="Selling price (₹)" required inputMode="decimal" defaultValue={product ? paiseToRupeesInput(product.pricePaise) : undefined} hint="Including taxes."/>
      <Field name="mrp" label="MRP (₹)" required inputMode="decimal" defaultValue={product ? paiseToRupeesInput(product.mrpPaise) : undefined}/>
      {/* Keyed on the stored stock so it re-mounts with the live value after a save; it must always match loadedStock. */}
      <Field key={`stock-${product?.stock ?? 0}`} name="stock" label="Stock (packs)" required inputMode="numeric" defaultValue={product?.stock ?? 0}/>
    </div>
    <div className="form-grid">
      <Field name="icon" label="Fallback emoji" required defaultValue={product?.icon ?? '🛒'} maxLength={8}/>
      <Field name="imageUrl" label="Photo URL" defaultValue={product?.imageUrl ?? ''} maxLength={500} hint="A licensed photo: /images/products/… or https://…"/>
    </div>
    <Field name="description" label="Description" required multiline defaultValue={product?.description} maxLength={2000}/>
    <div className="checkbox-row">
      <Checkbox name="active" label="Visible in store" defaultChecked={product?.active ?? true}/>
      <Checkbox name="featured" label="Feature on home page" defaultChecked={product?.featured}/>
    </div>
  </ActionForm>;
}
