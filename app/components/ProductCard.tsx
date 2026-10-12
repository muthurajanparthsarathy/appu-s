import Link from 'next/link';
import { ArrowUpRight, Leaf } from 'lucide-react';
import type { Product } from '@/app/lib/types';
import { money } from '@/app/lib/money';
import { AddToCart } from './ShopControls';
// The product photo when the catalogue has one; otherwise a neutral "photo coming soon" tile (no stand-in pictures).
export function ProductVisual({ product, large = false }: { product: Pick<Product, 'name' | 'imageUrl'> & { unit?: string }; large?: boolean }) {
  return <div className={`product-visual ${large ? 'large' : ''} ${product.imageUrl ? 'has-photo' : 'no-photo'}`}>{product.imageUrl
    ? <img src={product.imageUrl} alt={product.name} loading={large ? 'eager' : 'lazy'} className="product-photo"/>
    : <div className="photo-placeholder"><strong>{product.name}</strong>{product.unit && <span>{product.unit}</span>}<small>Photo coming soon</small></div>}</div>;
}
export function OfferBadge({ product }: { product: Pick<Product, 'offer' | 'pricePaise' | 'mrpPaise'> }) {
  if (product.offer === 'BOGO') return <span className="discount bogo">BUY 1 GET 1</span>;
  const discount = Math.round((1 - product.pricePaise / product.mrpPaise) * 100);
  return discount > 0 ? <span className="discount">{discount}% OFF</span> : null;
}
export function ProductCard({ product }: { product: Product }) {
  return <article className="product-card"><Link href={`/product/${product.slug}`} className="product-image-link" aria-label={`View ${product.name} ${product.unit}`}><ProductVisual product={product}/><OfferBadge product={product}/><ArrowUpRight className="product-arrow" size={18}/></Link><div className="product-info"><span className="product-brand"><Leaf size={11}/>{product.brand}</span><Link href={`/product/${product.slug}`}><h3>{product.name}</h3></Link><p className="unit">{product.unit}</p><div className="price"><strong>{money(product.pricePaise)}</strong>{product.mrpPaise > product.pricePaise && <del>{money(product.mrpPaise)}</del>}</div><AddToCart product={product}/></div></article>;
}
