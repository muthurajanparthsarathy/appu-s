'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Grid2X2, Home, Leaf, Search, ShieldCheck, ShoppingBag, Tag, Truck, UserRound } from 'lucide-react';
import { useCart } from './CartProvider';
import { PincodeChecker } from './PincodeChecker';
type HeaderUser = { name: string; role: 'CUSTOMER' | 'ADMIN' } | null;
export function Logo() { return <Link className="logo" href="/" aria-label="Appu’s Mart home"><span className="logo-mark"><Leaf size={34}/></span><span>Appu’s <span className="orange">Mart</span><small>Good Food. Better Living.</small></span></Link>; }
export function Header({ user }: { user: HeaderUser }) {
  const { count } = useCart();
  const firstName = user?.name.split(' ')[0];
  return <><div className="announcement"><span><Truck size={14}/> Free delivery on orders above ₹499</span><span>Fresh picks. Everyday happiness.</span></div><header className="header wrap"><Logo/><form className="search" action="/shop" role="search"><Search size={18}/><input aria-label="Search groceries" name="q" placeholder="Search rice, oils, ghee, appalam…"/><button aria-label="Search" type="submit"><ArrowRight size={20}/></button></form><PincodeChecker/>{user?.role === 'ADMIN' && <Link href="/admin" className="header-account"><ShieldCheck size={23}/><small>Admin</small></Link>}<Link href={user ? '/account' : '/login'} className="header-account"><UserRound size={23}/><small>{firstName ? `Hi, ${firstName}` : 'Sign in'}</small></Link><Link href="/cart" className="cart-link"><ShoppingBag size={23}/><span>My basket<small>{count} items</small></span><b>{count}</b></Link></header></>;
}
export function BottomNav() {
  const pathname = usePathname(); const { count } = useCart();
  const entries = [{ href: '/', title: 'Home', Icon: Home }, { href: '/shop', title: 'Categories', Icon: Grid2X2 }, { href: '/offers', title: 'Offers', Icon: Tag }, { href: '/cart', title: `Basket${count ? ` (${count})` : ''}`, Icon: ShoppingBag }, { href: '/account', title: 'Account', Icon: UserRound }];
  return <nav className="bottom-nav" aria-label="Mobile navigation">{entries.map(({href,title,Icon}) => <Link key={href} href={href} aria-current={(href === '/' ? pathname === '/' : pathname.startsWith(href)) ? 'page' : undefined}><Icon size={21}/><span>{title}</span></Link>)}</nav>;
}
export function Footer() {
  return <footer><div className="wrap footer-inner"><div><Logo/><p>A little freshness. A lot of happiness.<br/><small>Delivering in Coimbatore · Prices include taxes</small></p></div>
    <nav aria-label="Footer" className="footer-links"><div><strong>Shop</strong><Link href="/shop">All groceries</Link><Link href="/offers">Offers</Link><Link href="/category/vegetables">Fresh vegetables</Link></div><div><strong>Help</strong><Link href="/help/delivery">Delivery &amp; cancellations</Link><Link href="/account/orders">Track my order</Link><Link href="/account">My account</Link></div></nav>
    <Link href="/shop" className="footer-cta">Explore the store <ArrowRight size={16}/></Link></div></footer>;
}
