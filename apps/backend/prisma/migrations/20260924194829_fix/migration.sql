-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SaleStatus" ADD VALUE 'DRAFT';
ALTER TYPE "SaleStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "SaleStatus" ADD VALUE 'FEL_PENDING';
ALTER TYPE "SaleStatus" ADD VALUE 'FEL_CERTIFIED';
ALTER TYPE "SaleStatus" ADD VALUE 'FEL_REJECTED';

-- DropIndex
DROP INDEX "AuditLog_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_entityId_idx";

-- DropIndex
DROP INDEX "AuditLog_entity_idx";

-- DropIndex
DROP INDEX "AuditLog_saleId_idx";

-- DropIndex
DROP INDEX "AuditLog_userId_idx";

-- DropIndex
DROP INDEX "Customer_name_idx";

-- DropIndex
DROP INDEX "InventoryMovement_createdAt_idx";

-- DropIndex
DROP INDEX "InventoryMovement_productId_idx";

-- DropIndex
DROP INDEX "InventoryMovement_userId_idx";

-- DropIndex
DROP INDEX "Payment_saleId_idx";

-- DropIndex
DROP INDEX "PrintJob_saleId_idx";

-- DropIndex
DROP INDEX "PrintJob_status_idx";

-- DropIndex
DROP INDEX "Product_active_idx";

-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- DropIndex
DROP INDEX "Product_name_idx";

-- DropIndex
DROP INDEX "RefreshToken_userId_idx";

-- DropIndex
DROP INDEX "Sale_createdAt_idx";

-- DropIndex
DROP INDEX "Sale_customerId_idx";

-- DropIndex
DROP INDEX "Sale_status_idx";

-- DropIndex
DROP INDEX "Sale_userId_idx";

-- DropIndex
DROP INDEX "SaleItem_productId_idx";

-- DropIndex
DROP INDEX "SaleItem_saleId_idx";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "customerType" DROP DEFAULT,
ALTER COLUMN "nit" DROP NOT NULL;
