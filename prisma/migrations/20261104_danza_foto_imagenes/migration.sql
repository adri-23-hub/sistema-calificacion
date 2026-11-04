-- AlterTable: foto del grupo de danza
ALTER TABLE "DanceGroup" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable: almacén de imágenes comprimidas (fotos de danzas, candidatas, logos)
CREATE TABLE "StoredImage" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredImage_pkey" PRIMARY KEY ("id")
);
