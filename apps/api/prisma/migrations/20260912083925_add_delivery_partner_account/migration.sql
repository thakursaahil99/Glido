-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DELIVERY_PARTNER';

-- AlterTable
ALTER TABLE "DeliveryPartner" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPartner_userId_key" ON "DeliveryPartner"("userId");

-- AddForeignKey
ALTER TABLE "DeliveryPartner" ADD CONSTRAINT "DeliveryPartner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
