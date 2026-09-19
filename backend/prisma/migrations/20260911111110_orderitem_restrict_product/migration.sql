/*
  Warnings:

  - Made the column `productId` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropIndex
DROP INDEX "Order_fullName_trgm_idx";

-- DropIndex
DROP INDEX "Order_orderNumber_trgm_idx";

-- DropIndex
DROP INDEX "Order_phone_trgm_idx";

-- DropIndex
DROP INDEX "Product_description_trgm_idx";

-- DropIndex
DROP INDEX "Product_name_trgm_idx";

-- DropIndex
DROP INDEX "Product_sku_trgm_idx";

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "productId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
