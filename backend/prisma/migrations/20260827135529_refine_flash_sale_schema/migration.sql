/*
  Warnings:

  - Added the required column `order_id` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reservation_quantity` to the `flash_sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sold_quantity` to the `flash_sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "order_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "flash_sales" ADD COLUMN     "reservation_quantity" INTEGER NOT NULL,
ADD COLUMN     "sold_quantity" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
