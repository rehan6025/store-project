/*
  Warnings:

  - The `plan` column on the `stores` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StorePlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "stores" DROP COLUMN "plan",
ADD COLUMN     "plan" "StorePlan" NOT NULL DEFAULT 'BASIC';
