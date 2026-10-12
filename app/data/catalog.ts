import type { Category, Product } from '@/app/lib/types';
// Appu's Mart catalogue (owner's list, 2026-10-12). Prices in paise; MRP equals price where only one price was given.
// Product photos are the manufacturer's (Ramalingam Agro Products) catalogue images; see docs/ASSETS.md.
export const categories: Category[] = [
  { slug: 'rice', name: 'Rice', icon: '🍚', imageUrl: '/images/categories/rice.webp' },
  { slug: 'oils', name: 'Cooking Oils', icon: '🫗', imageUrl: '/images/categories/oils.webp' },
  { slug: 'ghee-butter', name: 'Ghee & Butter', icon: '🧈', imageUrl: '/images/categories/ghee-butter.webp' },
  { slug: 'appalam-vathal', name: 'Appalam & Vathal', icon: '🍘', imageUrl: '/images/categories/appalam-vathal.webp' }
];

const about: Record<string, string> = {
  appalam: 'Crisp, traditional urad dal appalam. Fry, roast or microwave and serve with rice, sambar or rasam.',
  butter: 'Creamy butter for cooking, baking and spreading.',
  ghee: 'Pure cow ghee for tempering, sweets and everyday cooking.',
  sesame: 'Gingelly (sesame) oil for traditional South Indian cooking.',
  coconut: 'Coconut oil for everyday cooking and traditional recipes.',
  virgin: 'Cold-pressed virgin coconut oil.',
  groundnut: 'Groundnut oil for frying and everyday cooking.',
  ponniBoiled: 'Ponni boiled rice for everyday meals.',
  idli: 'Idli rice for soft idlis and crisp dosas.',
  ponniRaw: 'Ponni raw rice for pongal, sweets and everyday cooking.',
  samba: 'Fragrant seeraga samba rice, ideal for biryani.',
  vathal: 'Sun-dried vathal. Fry and serve with rice and kuzhambu.',
  curdChilli: 'Sun-dried curd chillies (mor milagai). Fry and serve with curd rice.'
};

type Row = { slug: string; name: string; brand: string; category: string; unit: string; price: number | null; mrp?: number; image?: string; about: keyof typeof about; bogo?: boolean; featured?: boolean };
// price: rupees; null = not priced yet, so the product is created hidden until a price is set in the admin.
const rows: Row[] = [
  { slug: 'appu-appalam-1kg', name: 'Appu Appalam', brand: 'Appu', category: 'appalam-vathal', unit: '1 kg', price: 260, mrp: 300, image: 'appu-appalam-150g', about: 'appalam' },
  { slug: 'appu-appalam-500g', name: 'Appu Appalam', brand: 'Appu', category: 'appalam-vathal', unit: '500 g', price: 135, mrp: 160, image: 'appu-appalam-150g', about: 'appalam' },
  { slug: 'appu-gold-appalam-200g', name: 'Appu Gold Appalam', brand: 'Appu', category: 'appalam-vathal', unit: '200 g', price: 90, mrp: 100, image: 'appu-appalam-200g', about: 'appalam', bogo: true, featured: true },
  { slug: 'appu-appalam-150g', name: 'Appu Appalam', brand: 'Appu', category: 'appalam-vathal', unit: '150 g', price: 80, image: 'appu-appalam-150g', about: 'appalam', bogo: true },
  { slug: 'pr-butter-1kg', name: 'PR Butter', brand: 'PR', category: 'ghee-butter', unit: '1 kg', price: 900, about: 'butter' },
  { slug: 'pr-butter-500g', name: 'PR Butter', brand: 'PR', category: 'ghee-butter', unit: '500 g', price: 510, about: 'butter' },
  { slug: 'pr-ghee-1l', name: 'PR Pure Ghee', brand: 'PR', category: 'ghee-butter', unit: '1 L', price: 1000, image: 'pr-ghee', about: 'ghee', featured: true },
  { slug: 'pr-ghee-500ml', name: 'PR Pure Ghee', brand: 'PR', category: 'ghee-butter', unit: '500 ml', price: 500, image: 'pr-ghee', about: 'ghee' },
  { slug: 'pr-sesame-oil-1l', name: 'PR Sesame Oil', brand: 'PR', category: 'oils', unit: '1 L', price: 300, image: 'pr-sesame-oil', about: 'sesame' },
  { slug: 'pr-sesame-oil-500ml', name: 'PR Sesame Oil', brand: 'PR', category: 'oils', unit: '500 ml', price: 150, image: 'pr-sesame-oil', about: 'sesame' },
  { slug: 'daivam-sesame-oil-1l', name: 'Daivam Sesame Oil', brand: 'Daivam', category: 'oils', unit: '1 L', price: 350, image: 'daivam-sesame-oil-1l', about: 'sesame', featured: true },
  { slug: 'daivam-sesame-oil-500ml', name: 'Daivam Sesame Oil', brand: 'Daivam', category: 'oils', unit: '500 ml', price: 180, image: 'daivam-sesame-oil-500ml', about: 'sesame' },
  { slug: 'pr-coconut-oil-1l', name: 'PR Coconut Oil', brand: 'PR', category: 'oils', unit: '1 L', price: 400, image: 'pr-coconut-oil-1l', about: 'coconut', featured: true },
  { slug: 'pr-coconut-oil-500ml', name: 'PR Coconut Oil', brand: 'PR', category: 'oils', unit: '500 ml', price: 210, image: 'pr-coconut-oil-500ml', about: 'coconut' },
  { slug: 'virgin-coconut-oil-1l', name: 'Virgin Coconut Oil', brand: 'PR', category: 'oils', unit: '1 L', price: 800, image: 'cold-pressed-coconut-oil', about: 'virgin' },
  { slug: 'virgin-coconut-oil-500ml', name: 'Virgin Coconut Oil', brand: 'PR', category: 'oils', unit: '500 ml', price: 410, image: 'cold-pressed-coconut-oil', about: 'virgin' },
  { slug: 'pr-groundnut-oil-1l', name: 'PR Groundnut Oil', brand: 'PR', category: 'oils', unit: '1 L', price: 300, about: 'groundnut' },
  { slug: 'pr-groundnut-oil-500ml', name: 'PR Groundnut Oil', brand: 'PR', category: 'oils', unit: '500 ml', price: 160, about: 'groundnut' },
  { slug: 'appu-ponni-boiled-rice-26kg', name: 'Appu Ponni Boiled Rice', brand: 'Appu', category: 'rice', unit: '26 kg', price: null, image: 'appu-ponni-boiled-rice', about: 'ponniBoiled' },
  { slug: 'appu-ponni-boiled-rice-10kg', name: 'Appu Ponni Boiled Rice', brand: 'Appu', category: 'rice', unit: '10 kg', price: 800, image: 'appu-ponni-boiled-rice', about: 'ponniBoiled', featured: true },
  // Listed as "26 KGS60" in the owner's price list; kept hidden until the price is confirmed.
  { slug: 'appu-idli-rice-26kg', name: 'Appu Idli Rice', brand: 'Appu', category: 'rice', unit: '26 kg', price: null, about: 'idli' },
  { slug: 'appu-idli-rice-10kg', name: 'Appu Idli Rice', brand: 'Appu', category: 'rice', unit: '10 kg', price: 550, about: 'idli' },
  { slug: 'appu-ponni-raw-rice-26kg', name: 'Appu Ponni Raw Rice', brand: 'Appu', category: 'rice', unit: '26 kg', price: null, image: 'appu-ponni-raw-rice', about: 'ponniRaw' },
  { slug: 'appu-ponni-raw-rice-10kg', name: 'Appu Ponni Raw Rice', brand: 'Appu', category: 'rice', unit: '10 kg', price: 800, image: 'appu-ponni-raw-rice', about: 'ponniRaw' },
  { slug: 'appu-seeraga-samba-rice-10kg', name: 'Appu Seeraga Samba Rice', brand: 'Appu', category: 'rice', unit: '10 kg', price: null, about: 'samba' },
  { slug: 'appu-seeraga-samba-rice-1kg', name: 'Appu Seeraga Samba Rice', brand: 'Appu', category: 'rice', unit: '1 kg', price: null, about: 'samba' },
  { slug: 'curd-chilli-200g', name: 'Curd Chilli', brand: 'Traditional', category: 'appalam-vathal', unit: '200 g', price: null, about: 'curdChilli' },
  { slug: 'mithuku-vathal-200g', name: 'Mithuku Vathal', brand: 'Traditional', category: 'appalam-vathal', unit: '200 g', price: null, about: 'vathal' },
  { slug: 'manathakkali-vathal-200g', name: 'Manathakkali Vathal', brand: 'Traditional', category: 'appalam-vathal', unit: '200 g', price: null, about: 'vathal' },
  { slug: 'sunda-vathal-200g', name: 'Sunda Vathal', brand: 'Traditional', category: 'appalam-vathal', unit: '200 g', price: null, about: 'vathal' }
];

const icons: Record<string, string> = { rice: '🍚', oils: '🫗', 'ghee-butter': '🧈', 'appalam-vathal': '🍘' };
const DEFAULT_STOCK = 50;

// Full catalogue including hidden (unpriced) products, used by the database seed.
export const catalogProducts: (Product & { active: boolean })[] = rows.map(row => {
  const active = row.price !== null;
  const pricePaise = (row.price ?? 0) * 100;
  return {
    id: row.slug, slug: row.slug, name: row.name, brand: row.brand, categorySlug: row.category, unit: row.unit,
    pricePaise, mrpPaise: (row.mrp ?? row.price ?? 0) * 100, stock: active ? DEFAULT_STOCK : 0,
    icon: icons[row.category], imageUrl: row.image ? `/images/products/${row.image}.webp` : null,
    offer: row.bogo ? 'BOGO' : 'NONE', featured: Boolean(row.featured), active,
    description: `${about[row.about]}${row.bogo ? ' Buy 1 Get 1 free: add 2 packs and pay for 1.' : ''} Pack size: ${row.unit}.`
  };
});

// Products visible in demo mode (no database): only priced ones.
export const products: Product[] = catalogProducts.filter(p => p.active).map(({ active: _active, ...product }) => product);
