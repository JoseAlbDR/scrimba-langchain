-- CreateTable
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "vector" vector,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
