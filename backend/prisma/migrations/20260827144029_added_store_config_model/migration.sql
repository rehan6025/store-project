/*
  Warnings:

  - A unique constraint covering the columns `[product_id]` on the table `inventories` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StoreConfigStatus" AS ENUM ('ACTIVE', 'BACKUP');

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "price_at_purchase" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "store_configs" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "content_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventories_product_id_key" ON "inventories"("product_id");

-- AddForeignKey
ALTER TABLE "store_configs" ADD CONSTRAINT "store_configs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
