import type { Category, Product } from '@/app/lib/types';
export const categories: Category[] = [
  { slug: 'vegetables', name: 'Fresh Vegetables', icon: '🥦' }, { slug: 'fruits', name: 'Fresh Fruits', icon: '🍊' },
  { slug: 'groceries', name: 'Groceries', icon: '🛒' }, { slug: 'rice-dals', name: 'Rice, Flour & Dals', icon: '🍚' },
  { slug: 'frozen', name: 'Frozen Foods', icon: '❄️' }, { slug: 'nuts', name: 'Dry Fruits & Nuts', icon: '🥜' },
  { slug: 'spices', name: 'Spices & Masalas', icon: '🌶️' }, { slug: 'snacks', name: 'Sweets & Snacks', icon: '🍪' },
  { slug: 'household', name: 'Puja & Household', icon: '🪔' }, { slug: 'care', name: 'Health & Beauty', icon: '🧴' }
];
const rows: [string, string, string, string, number, number, string, string, number][] = [
  ['tomato','Tomato','vegetables','1 kg',3200,4000,'🍅','Farm selection',48],
  ['basmati-rice','Basmati Rice','rice-dals','5 kg',42000,49500,'🌾','Veena Pantry',20],
  ['toor-dal','Toor Dal','rice-dals','1 kg',9800,11000,'🌰','Veena Pantry',32],
  ['whole-wheat-atta','Whole Wheat Atta','rice-dals','5 kg',26500,29900,'🌾','Veena Pantry',18],
  ['sunflower-oil','Sunflower Oil','groceries','1 L',12600,15500,'🌻','Daily Good',12],
  ['onion','Onion','vegetables','1 kg',2800,3500,'🧅','Farm selection',64],
  ['potato','Potato','vegetables','1 kg',2600,3000,'🥔','Farm selection',60],
  ['carrot','Carrot','vegetables','500 g',3400,4000,'🥕','Farm selection',24],
  ['capsicum','Green Capsicum','vegetables','500 g',3600,4500,'🌶️','Farm selection',30],
  ['broccoli','Broccoli','vegetables','1 piece',6500,8000,'🥦','Farm selection',0],
  ['orange','Sweet Orange','fruits','1 kg',8900,11000,'🍊','Farm selection',40],
  ['banana','Banana','fruits','6 pieces',4500,5000,'🍌','Farm selection',36],
  ['cashews','Whole Cashews','nuts','250 g',22500,27500,'🥜','Veena Pantry',22],
  ['chilli','Dried Red Chilli','spices','100 g',4800,6000,'🌶️','Veena Pantry',32],
  ['cookies','Butter Cookies','snacks','200 g',6000,7500,'🍪','Daily Good',45],
  ['frozen-peas','Frozen Green Peas','frozen','500 g',9500,11000,'🌱','Daily Good',15],
  ['diya','Clay Diyas, set of 6','household','6 pieces',6000,8000,'🪔','Home Ritual',20],
  ['handwash','Aloe Hand Wash','care','250 ml',9900,12000,'🧴','Daily Good',18]
];
export const products: Product[] = rows.map(([slug,name,categorySlug,unit,pricePaise,mrpPaise,icon,brand,stock], index) => ({ id: slug, slug, name, categorySlug, unit, pricePaise, mrpPaise, icon, brand, stock, featured: index < 5, imageUrl: null, description: `${name} for your everyday essentials. Selected with care and packed for your pantry. Pack size: ${unit}. Images and prices are illustrative demo content.` }));
