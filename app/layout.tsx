import type { Metadata } from 'next';
import { CartProvider } from './components/CartProvider';
import { BottomNav, Footer, Header } from './components/Shell';
import { getCurrentUser } from './server/session';
import './globals.css';
export const metadata: Metadata = { title: { default: 'VeenaMart — Good food. Better living.', template: '%s | VeenaMart' }, description: 'Your everyday Indian grocery store. Discover fresh vegetables, pantry essentials and the little things that make a home.' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A database outage must not take down catalogue browsing; the header simply shows a signed-out state.
  const user = await getCurrentUser().catch(() => null);
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><CartProvider><Header user={user && { name: user.name, role: user.role }}/><div id="main-content">{children}</div><Footer/><BottomNav/></CartProvider></body></html>;
}
