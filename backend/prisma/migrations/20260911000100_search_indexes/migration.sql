-- Full-text friendly search acceleration for the product catalogue.
-- pg_trgm enables fast ILIKE '%term%' queries on name/description/sku.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_description_trgm_idx" ON "Product" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_sku_trgm_idx" ON "Product" USING GIN ("sku" gin_trgm_ops);

-- Order number prefix searches (admin order lookup by partial number)
CREATE INDEX IF NOT EXISTS "Order_orderNumber_trgm_idx" ON "Order" USING GIN ("orderNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Order_fullName_trgm_idx" ON "Order" USING GIN ("fullName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Order_phone_trgm_idx" ON "Order" USING GIN ("phone" gin_trgm_ops);
