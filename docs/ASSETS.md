# Assets (Appu's Mart)

## Product photos: manufacturer's catalogue (2026-10-12)

At the owner's direction, product photos come from the IndiaMART catalogue of **Ramalingam Agro Products Pvt. Ltd.** (https://www.indiamart.com/ramalingamagroproducts/). They make and sell Appu Appalam, Appu Ponni rice, PR oils and ghee, and Daivam gingelly oil.

Before use, each image was:
1. Downloaded into a quarantine folder.
2. Checked as a valid image.
3. Viewed to confirm it shows the stated product.
4. Cropped square to 480×480 WebP.

The owner should confirm they may use the manufacturer's images (e.g. as a reseller) or replace them with their own photos.

| `public/images/products/…` | Used for | Source listing |
| --- | --- | --- |
| `appu-appalam-150g` | Appu Appalam 150 g, and **as a stand-in for 500 g and 1 kg** | "APPU APPALAM PAPAD 150g" |
| `appu-appalam-200g` | Appu Gold Appalam 200 g | "200g Appu Gold Applam Papad" |
| `appu-ponni-boiled-rice` | Ponni Boiled Rice 10 kg (and hidden 26 kg) | "APPU PONNI BOILED RICE 10KG" |
| `appu-ponni-raw-rice` | Ponni Raw Rice 10 kg (and hidden 26 kg) | "10kg Appu Ponni Raw Rice" |
| `pr-ghee` | PR Pure Ghee 1 L and 500 ml | "PR PURE COW GHEE" |
| `pr-sesame-oil` | PR Sesame Oil 1 L and 500 ml | "PR SESAME OIL 1 LTR" |
| `daivam-sesame-oil-1l`, `daivam-sesame-oil-500ml` | Daivam Sesame Oil | "DAIVAM SEASAME OIL 1 LTR", "DAIVAM SESAME OIL 500ml" (the seller's 500 ml listing uses its 1 L photo) |
| `pr-coconut-oil-1l`, `pr-coconut-oil-500ml` | PR Coconut Oil | "PR COCONUT OIL 1 LTR", "PR COCONUT OIL 500ml" |
| `cold-pressed-coconut-oil` | Virgin Coconut Oil 1 L and 500 ml (**assumed** to be PR cold-pressed; confirm) | "Cold Pressed Coconut Oil" |

Also derived from these photos:
- **Category circles:** `categories/{rice,oils,ghee-butter,appalam-vathal}.webp`.
- **Promo art:** `promos/{oils,appalam}.webp`.
- **Banner cut-outs:** `hero-rice.webp` and `hero-appalam.webp`, where the studio background was removed to transparency.

**No photo yet** (a neutral "Photo coming soon" tile is shown): PR Butter, PR Groundnut Oil, Appu Idli Rice, Appu Seeraga Samba Rice, Curd Chilli and the three vathals. Add a photo via Admin → Products → Photo URL (`/images/products/<file>` or an https URL).

## Banner artwork

`public/images/hero-banner.webp` is the left part of the owner's desktop design banner: vegetable basket, rice sack and spice bowls. The part with "VeenaMart"-printed packs was deliberately cut out after the rename. The right edge fades to transparent. `hero-leaves-right.webp` is the mirrored leaf strip from the same design.

## Unused

`public/images/grocery-hero.png`, the original generated hero image, is unused and can be deleted. The design references in `docs/references/` are inputs only.
