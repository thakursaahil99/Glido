-- CreateTable
CREATE TABLE "GroceryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroceryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryProduct" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "imageUrl" TEXT,
    "unit" TEXT NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "couponId" TEXT,
    "deliveryInstructions" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "priceSnapshot" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GroceryOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryOrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroceryOrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroceryCategory_name_key" ON "GroceryCategory"("name");

-- CreateIndex
CREATE INDEX "GroceryProduct_categoryId_idx" ON "GroceryProduct"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "GroceryOrder_orderNumber_key" ON "GroceryOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "GroceryOrder_userId_idx" ON "GroceryOrder"("userId");

-- CreateIndex
CREATE INDEX "GroceryOrder_status_idx" ON "GroceryOrder"("status");

-- CreateIndex
CREATE INDEX "GroceryOrderItem_orderId_idx" ON "GroceryOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "GroceryOrderStatusHistory_orderId_idx" ON "GroceryOrderStatusHistory"("orderId");

-- AddForeignKey
ALTER TABLE "GroceryProduct" ADD CONSTRAINT "GroceryProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GroceryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryOrder" ADD CONSTRAINT "GroceryOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryOrder" ADD CONSTRAINT "GroceryOrder_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryOrder" ADD CONSTRAINT "GroceryOrder_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryOrderItem" ADD CONSTRAINT "GroceryOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "GroceryOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryOrderItem" ADD CONSTRAINT "GroceryOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "GroceryProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryOrderStatusHistory" ADD CONSTRAINT "GroceryOrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "GroceryOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
