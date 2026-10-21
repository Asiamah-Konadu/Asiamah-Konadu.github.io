CREATE TABLE IF NOT EXISTS "orders" (
    "reference" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("reference")
);
