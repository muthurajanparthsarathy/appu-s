import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgePercent, ChevronDown, LayoutGrid, Leaf, Menu, PackageCheck, ShieldCheck, Sprout, Truck } from 'lucide-react';
import { getCategories, getProducts } from './server/catalog';
import { CategoryStrip, CategoryThumb } from './components/CategoryStrip';
import { ProductCard } from './components/ProductCard';
export const dynamic = 'force-dynamic';

const heroFeatures = [
  { Icon: Sprout, text: 'Pure Quality Staples' },
  { Icon: LayoutGrid, text: 'Rice, Oils, Ghee & Appalam' },
  { Icon: BadgePercent, text: 'Great Offers & Deals' },
  { Icon: Truck, text: 'Delivered to Your Doorstep' }
];
const trust = [
  { Icon: Leaf, title: 'Trusted brands', text: 'Appu, PR and Daivam staples' },
  { Icon: ShieldCheck, title: 'Pay your way', text: 'Cash on delivery available' },
  { Icon: Truck, title: 'Choose your slot', text: 'Delivering across Coimbatore' },
  { Icon: PackageCheck, title: 'Your pantry, sorted', text: 'Rice, oils, ghee, butter and appalam' }
];

export default async function Home() {
  const [categories, products] = await Promise.all([getCategories(), getProducts({ featured: true }, 5)]);
  return <main>
    <nav className="desktop-categories" aria-label="Categories"><div className="wrap">
      <Link className="all-categories" href="/shop"><Menu size={16}/> All Categories <ChevronDown size={14}/></Link>
      {categories.slice(0, 8).map(c => <Link href={`/category/${c.slug}`} key={c.slug}><CategoryThumb category={c} size={24}/>{c.name}</Link>)}
    </div></nav>

    <section className="hero" aria-label="Welcome to Appu’s Mart"><div className="wrap hero-inner">
      <div className="hero-content">
        <span className="script">Pure &amp; Fresh</span>
        <h1>Authentic Indian Groceries</h1>
        <p className="hero-sub">From our home to yours</p>
        <ul className="hero-features">{heroFeatures.map(({ Icon, text }) => <li key={text}><Icon size={18}/><span>{text}</span></li>)}</ul>
        <div className="hero-actions"><Link href="/shop" className="button">Shop Groceries <ArrowRight size={16}/></Link><Link href="/offers" className="button outline">View Offers</Link></div>
      </div>
      <div className="hero-art"><Image src="/images/hero-banner.webp" alt="A basket of fresh vegetables beside a sack of rice and bowls of spices" fill priority quality={90} sizes="(max-width: 760px) 70vw, 520px" className="hero-image"/></div>
      <div className="hero-products" aria-hidden="true">
        <Image src="/images/hero-rice.webp" alt="" width={383} height={363} quality={92} className="hero-pack rice"/>
        <Image src="/images/hero-appalam.webp" alt="" width={388} height={267} quality={92} className="hero-pack appalam"/>
      </div>
    </div></section>

    <section className="trust-strip wrap" aria-label="Store benefits">{trust.map(({ Icon, title, text }) => <div key={title}><span className="trust-icon"><Icon size={24}/></span><span><strong>{title}</strong><small>{text}</small></span></div>)}</section>

    <section className="wrap category-section" aria-label="Shop by category"><CategoryStrip categories={categories}/></section>

    <div className="wrap home-showcase">
      <section className="bestseller-section" aria-labelledby="best-sellers">
        <div className="section-title"><div><h2 id="best-sellers"><Leaf size={22}/> Best Sellers</h2><p>Pantry favourites, picked for every day.</p></div><Link href="/shop">View All <ArrowRight size={16}/></Link></div>
        <div className="home-grid">{products.map(product => <ProductCard product={product} key={product.id}/>)}</div>
      </section>
      <div className="promos">
        <Link href="/category/oils" className="promo fresh-promo">
          <div><h2>Pure Cooking Oils</h2><p className="promo-sub">Sesame, coconut &amp; groundnut</p><ul className="promo-tags"><li><Sprout size={14}/> Daivam</li><li><Sprout size={14}/> PR Brand</li></ul><span className="button small">Shop Now <ArrowRight size={14}/></span></div>
          <Image src="/images/promos/oils.webp" alt="" width={460} height={258} quality={90} className="promo-art"/>
        </Link>
        <Link href="/category/appalam-vathal" className="promo festival-promo">
          <div><h2>Appu Appalam</h2><p className="promo-sub">Buy 1 Get 1 free on 150 g &amp; 200 g</p><span className="button small orange">Shop Now <ArrowRight size={14}/></span></div>
          <Image src="/images/promos/appalam.webp" alt="" width={460} height={258} quality={90} className="promo-art"/>
        </Link>
      </div>
    </div>
  </main>;
}
