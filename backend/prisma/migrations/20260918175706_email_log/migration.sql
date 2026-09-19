-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "toEmail" VARCHAR(160) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "template" VARCHAR(40) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'skipped',
    "error" VARCHAR(300),
    "orderId" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_orderId_idx" ON "EmailLog"("orderId");
