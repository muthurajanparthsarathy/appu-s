# Basket animation update

Inspired by the observed product-thumbnail-to-bag interaction on https://firstcut.200-97-164-140.sslip.io/. Implemented independently for the existing Appu’s Mart storefront in the VeenaMart project.

- Product thumbnail flies in a straight line (600 ms, no arc) to the visible basket icon. Mobile prefers the bottom navigation basket. If the desktop header is offscreen, a temporary floating basket provides a visible destination.
- Basket icon bounces on arrival; quantity changes animate; a dismissible confirmation includes a View basket link.
- Missing product photography falls back to a bag icon. Rapid additions replace prior feedback and cancel obsolete timers. Cart state updates immediately, independently of the animation.
- Reduced-motion users receive confirmation without the flight or bounce. A polite live region announces the added product and resulting quantity.
- Existing stock/quantity limits, local persistence, pricing and checkout behavior are retained.

Validation: TypeScript passed; all 22 existing tests passed. Browser checked mobile listing add-to-cart and desktop product-detail increment, including offscreen-header fallback. Saved mobile preview: cart-animation-preview.png. Production deployment was not performed.
