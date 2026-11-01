-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('MASS', 'AFFLUENT', 'PLATINUM', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING', 'REVERSED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_VERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "cif" TEXT NOT NULL,
    "syntheticId" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL DEFAULT 'XXXXXXXXXXX',
    "thaiName" TEXT NOT NULL,
    "englishName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "segment" "CustomerSegment" NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'TH',
    "preferredChannel" TEXT NOT NULL DEFAULT 'VOICE',
    "vip" BOOLEAN NOT NULL DEFAULT false,
    "risk" "RiskLevel" NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT true,
    "kycStatus" "KycStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "maskedNumber" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,
    "availableBalance" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "maskedNumber" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL,
    "creditLimit" DECIMAL(18,2) NOT NULL,
    "availableCredit" DECIMAL(18,2) NOT NULL,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTransaction" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "originalPrincipal" DECIMAL(18,2) NOT NULL,
    "outstandingPrincipal" DECIMAL(18,2) NOT NULL,
    "interestRate" DECIMAL(6,3) NOT NULL,
    "monthlyPayment" DECIMAL(18,2) NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "collectionStage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromiseToPay" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "promiseDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromiseToPay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileBanking" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "lastLogin" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "registrationStatus" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileBanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sourceAccount" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "channel" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "failureReason" TEXT,
    "refundStatus" TEXT,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudAlert" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "transactionId" TEXT,
    "fraudType" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "reasons" TEXT[],
    "status" TEXT NOT NULL,
    "investigationStatus" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "disclaimer" TEXT NOT NULL DEFAULT 'DEMO RECOMMENDATION — NOT A PRODUCTION CREDIT DECISION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankingCredential" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "kycStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "registrationReference" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankingCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductApplication" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productCategory" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reference" TEXT NOT NULL,
    "applicantType" TEXT NOT NULL DEFAULT 'EXISTING_CUSTOMER',
    "applicantSnapshot" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "decisionReason" TEXT,
    "provisionedResourceId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "units" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "marketValue" DECIMAL(18,2) NOT NULL,
    "costBasis" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "customerId" TEXT,
    "resource" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "correlationId" TEXT,
    "genesysConversationId" TEXT,
    "serviceNowCaseId" TEXT,
    "googleAiSessionId" TEXT,
    "uiPathJobId" TEXT,
    "result" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "seedVersion" TEXT NOT NULL,
    "lastReset" TIMESTAMP(3),
    "lastBackup" TIMESTAMP(3),
    "internetBankingMaxFailedAttempts" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "LabState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_cif_key" ON "Customer"("cif");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_syntheticId_key" ON "Customer"("syntheticId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_englishName_key" ON "Customer"("englishName");

-- CreateIndex
CREATE INDEX "Account_customerId_idx" ON "Account"("customerId");

-- CreateIndex
CREATE INDEX "AccountTransaction_accountId_occurredAt_idx" ON "AccountTransaction"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "Card_customerId_idx" ON "Card"("customerId");

-- CreateIndex
CREATE INDEX "CardTransaction_cardId_occurredAt_idx" ON "CardTransaction"("cardId", "occurredAt");

-- CreateIndex
CREATE INDEX "Loan_customerId_idx" ON "Loan"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PromiseToPay_reference_key" ON "PromiseToPay"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "MobileBanking_customerId_key" ON "MobileBanking"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "FraudAlert_customerId_idx" ON "FraudAlert"("customerId");

-- CreateIndex
CREATE INDEX "Offer_customerId_idx" ON "Offer"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "BankingCredential_customerId_key" ON "BankingCredential"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "BankingCredential_username_key" ON "BankingCredential"("username");

-- CreateIndex
CREATE UNIQUE INDEX "BankingCredential_registrationReference_key" ON "BankingCredential"("registrationReference");

-- CreateIndex
CREATE UNIQUE INDEX "ProductApplication_reference_key" ON "ProductApplication"("reference");

-- CreateIndex
CREATE INDEX "ProductApplication_customerId_submittedAt_idx" ON "ProductApplication"("customerId", "submittedAt");

-- CreateIndex
CREATE INDEX "Investment_customerId_idx" ON "Investment"("customerId");

-- CreateIndex
CREATE INDEX "AuditLog_customerId_timestamp_idx" ON "AuditLog"("customerId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiClient_name_key" ON "ApiClient"("name");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromiseToPay" ADD CONSTRAINT "PromiseToPay_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileBanking" ADD CONSTRAINT "MobileBanking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "CardTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingCredential" ADD CONSTRAINT "BankingCredential_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApplication" ADD CONSTRAINT "ProductApplication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
