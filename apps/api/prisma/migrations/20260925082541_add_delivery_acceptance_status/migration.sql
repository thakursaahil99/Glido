-- CreateEnum
CREATE TYPE "DeliveryAcceptanceStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "GroceryOrder" ADD COLUMN     "deliveryAcceptanceStatus" "DeliveryAcceptanceStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryAcceptanceStatus" "DeliveryAcceptanceStatus" NOT NULL DEFAULT 'NONE';
