export type Category = { slug: string; name: string; icon: string };
export type Product = { id: string; slug: string; name: string; categorySlug: string; brand: string; unit: string; pricePaise: number; mrpPaise: number; stock: number; icon: string; imageUrl: string | null; description: string; featured: boolean };
export type CartLine = { productId: string; quantity: number };
export type Quote = { items: { product: Product; quantity: number; lineTotalPaise: number }[]; subtotalPaise: number; deliveryPaise: number; totalPaise: number; savingsPaise: number };
export type ProductPage = { products: Product[]; total: number; page: number; pageCount: number };
export type ActionResult = { error?: string; fieldErrors?: Record<string, string>; ok?: string } | void;
export type SessionUser = { id: string; email: string; name: string; phone: string | null; role: 'CUSTOMER' | 'ADMIN' };
export type SlotOption = { id: string; dayLabel: string; timeLabel: string };
