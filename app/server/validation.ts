import { PASSWORD_MAX, PASSWORD_MIN } from './password';
import { isPincode } from './delivery';

export type FieldErrors = Record<string, string>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const text = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export const normalizeEmail = (value: unknown) => text(value).toLowerCase();
export const isEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Accepts "98765 43210", "+91 9876543210", "09876543210"; returns the 10-digit mobile or null.
export function normalizeIndianMobile(value: unknown) {
  const digits = text(value).replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

// Sign-in accepts an email address or the 10-digit Indian mobile number saved at registration.
export function parseLoginIdentifier(value: unknown): { email: string } | { phone: string } | null {
  const raw = text(value);
  if (!raw) return null;
  if (raw.includes('@')) {
    const email = normalizeEmail(raw);
    return isEmail(email) ? { email } : null;
  }
  const phone = normalizeIndianMobile(raw);
  return phone ? { phone } : null;
}

export function parseRegistration(input: { name: unknown; email: unknown; password: unknown; phone?: unknown }): Parsed<{ name: string; email: string; password: string; phone: string | null }> {
  const errors: FieldErrors = {};
  const name = text(input.name);
  const email = normalizeEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const phoneRaw = text(input.phone);
  const phone = phoneRaw ? normalizeIndianMobile(phoneRaw) : null;
  if (name.length < 2 || name.length > 80) errors.name = 'Enter your name (2–80 characters).';
  if (!isEmail(email)) errors.email = 'Enter a valid email address.';
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) errors.password = `Use ${PASSWORD_MIN}–${PASSWORD_MAX} characters for your password.`;
  if (phoneRaw && !phone) errors.phone = 'Enter a 10-digit Indian mobile number.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: { name, email, password, phone } };
}

export type AddressInput = { fullName: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; pincode: string };

export function parseAddress(input: Record<string, unknown>): Parsed<AddressInput> {
  const errors: FieldErrors = {};
  const fullName = text(input.fullName);
  const phone = normalizeIndianMobile(input.phone);
  const line1 = text(input.line1);
  const line2 = text(input.line2) || null;
  const landmark = text(input.landmark) || null;
  const city = text(input.city);
  const pincode = text(input.pincode);
  if (fullName.length < 2 || fullName.length > 80) errors.fullName = 'Enter the recipient’s name.';
  if (!phone) errors.phone = 'Enter a 10-digit Indian mobile number.';
  if (line1.length < 5 || line1.length > 160) errors.line1 = 'Enter the house/flat number and street (5–160 characters).';
  if (line2 && line2.length > 160) errors.line2 = 'Keep the second address line under 160 characters.';
  if (landmark && landmark.length > 80) errors.landmark = 'Keep the landmark under 80 characters.';
  if (city.length < 2 || city.length > 60) errors.city = 'Enter the city.';
  if (!isPincode(pincode)) errors.pincode = 'Enter a valid 6-digit pincode.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: { fullName, phone: phone!, line1, line2, landmark, city, pincode } };
}

export const slugify = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export type ProductInput = { name: string; slug: string; categorySlug: string; brand: string; unit: string; pricePaise: number; mrpPaise: number; stock: number; icon: string; imageUrl: string | null; offer: 'NONE' | 'BOGO'; description: string; featured: boolean; active: boolean };

// Admin product form. Prices arrive as rupee strings and are converted to integer paise.
export function parseProduct(input: Record<string, unknown>, parsePaise: (value: unknown) => number | null): Parsed<ProductInput> {
  const errors: FieldErrors = {};
  const name = text(input.name);
  const slug = slugify(text(input.slug) || name);
  const categorySlug = text(input.categorySlug);
  const brand = text(input.brand);
  const unit = text(input.unit);
  const pricePaise = parsePaise(input.price);
  const mrpPaise = parsePaise(input.mrp);
  const stockText = text(input.stock);
  const stock = /^\d{1,6}$/.test(stockText) ? Number(stockText) : NaN;
  const icon = text(input.icon);
  const imageUrl = text(input.imageUrl) || null;
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (name.length < 2 || name.length > 120) errors.name = 'Enter a product name (2–120 characters).';
  if (slug.length < 2) errors.slug = 'Enter a URL slug using letters and numbers.';
  if (!categorySlug) errors.categorySlug = 'Choose a category.';
  if (brand.length < 1 || brand.length > 60) errors.brand = 'Enter the brand (up to 60 characters).';
  if (unit.length < 1 || unit.length > 30) errors.unit = 'Enter the pack size, e.g. “1 kg”.';
  if (!pricePaise) errors.price = 'Enter a selling price in rupees, e.g. 32 or 32.50.';
  if (!mrpPaise) errors.mrp = 'Enter the MRP in rupees.';
  else if (pricePaise && mrpPaise < pricePaise) errors.mrp = 'MRP cannot be lower than the selling price.';
  if (!Number.isInteger(stock)) errors.stock = 'Enter stock as a whole number of packs.';
  if (icon.length < 1 || [...icon].length > 4) errors.icon = 'Enter one emoji used when there is no photo.';
  if (imageUrl && (imageUrl.length > 500 || !(/^\/images\/[\w\-./]+$/.test(imageUrl) && !imageUrl.includes('..')) && !/^https:\/\/[^\s"'<>]+$/.test(imageUrl))) errors.imageUrl = 'Use a /images/… path or an https:// image URL.';
  if (description.length < 10 || description.length > 2000) errors.description = 'Write a description of 10–2000 characters.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: { name, slug, categorySlug, brand, unit, pricePaise: pricePaise!, mrpPaise: mrpPaise!, stock, icon, imageUrl, offer: input.offer === 'BOGO' ? 'BOGO' : 'NONE', description, featured: input.featured === 'on', active: input.active === 'on' } };
}

// Only same-site relative paths are allowed as post-login destinations. Parsed the way browsers parse it,
// because URL parsing strips tabs/newlines and treats "\" as "/", turning e.g. "/\t/evil.example" into "//evil.example".
const SAFE_BASE = 'http://veenamart.invalid';
export function safeNextPath(value: unknown, fallback = '/account') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.length > 200) return fallback;
  try {
    const url = new URL(value, SAFE_BASE);
    const path = url.pathname + url.search + url.hash;
    return url.origin === SAFE_BASE && !path.startsWith('//') && !path.startsWith('/\\') ? path : fallback;
  } catch { return fallback; }
}
