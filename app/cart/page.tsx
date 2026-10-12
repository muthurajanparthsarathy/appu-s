import { CartView } from '@/app/components/cart/CartView';
import { isDatabaseMode } from '@/app/server/config';
import { getCurrentUser } from '@/app/server/session';
export const metadata = { title: 'My basket' };
export default async function CartPage() {
  const user = await getCurrentUser().catch(() => null);
  return <CartView checkoutAvailable={isDatabaseMode()} signedIn={Boolean(user)}/>;
}
