-- Buy-one-get-one offers and honest paid/free quantities on order lines.
CREATE TYPE "ProductOffer" AS ENUM ('NONE', 'BOGO');

ALTER TABLE "Product" ADD COLUMN "offer" "ProductOffer" NOT NULL DEFAULT 'NONE';

-- Every pack on existing order lines was paid for.
ALTER TABLE "OrderItem" ADD COLUMN "paidQuantity" INTEGER;
UPDATE "OrderItem" SET "paidQuantity" = "quantity";
ALTER TABLE "OrderItem" ALTER COLUMN "paidQuantity" SET NOT NULL;

ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_amounts_valid";
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_amounts_valid" CHECK ("unitPricePaise" > 0 AND "mrpPaise" >= "unitPricePaise" AND "paidQuantity" BETWEEN 1 AND "quantity" AND "lineTotalPaise" = "unitPricePaise" * "paidQuantity");

-- Products can be stocked before they are priced, but only while hidden from the store.
ALTER TABLE "Product" DROP CONSTRAINT "Product_price_positive";
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_price_positive" CHECK ("pricePaise" > 0 OR NOT "active"),
  ADD CONSTRAINT "Product_price_nonnegative" CHECK ("pricePaise" >= 0);
