-- CreateTable
CREATE TABLE "domains" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "hostname" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains"("hostname");

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
