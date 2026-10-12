import Link from 'next/link';
import { ArrowUpRight, Leaf } from 'lucide-react';
import type { Product } from '@/app/lib/types';
import { money } from '@/app/lib/money';
import { AddToCart } from './ShopControls';
// Shows the licensed product photo when the catalog has one; otherwise a clearly-labelled emoji illustration.
export function ProductVisual({ product, large = false }: { product: Pick<Product, 'name' | 'icon' | 'imageUrl' | 'categorySlug'>; large?: boolean }) {
  return <div className={`product-visual ${large ? 'large' : ''} visual-${product.categorySlug}`}>{product.imageUrl
    ? <img src={product.imageUrl} alt={product.name} loading={large ? 'eager' : 'lazy'} className="product-photo"/>
    : <><span role="img" aria-label={`${product.name} illustration`}>{product.icon}</span><span className="visual-shadow"/></>}</div>;
}
export function ProductCard({ product }: { product: Product }) {
  const discount = Math.round((1-product.pricePaise/product.mrpPaise)*100);
  return <article className="product-card"><Link href={`/product/${product.slug}`} className="product-image-link" aria-label={`View ${product.name}`}><ProductVisual product={product}/>{discount > 0 && <span className="discount">{discount}% OFF</span>}<ArrowUpRight className="product-arrow" size={18}/></Link><div className="product-info"><span className="product-brand"><Leaf size={11}/>{product.brand}</span><Link href={`/product/${product.slug}`}><h3>{product.name}</h3></Link><p className="unit">{product.unit}</p><div className="price"><strong>{money(product.pricePaise)}</strong>{product.mrpPaise > product.pricePaise && <del>{money(product.mrpPaise)}</del>}</div><AddToCart product={product}/></div></article>;
}
