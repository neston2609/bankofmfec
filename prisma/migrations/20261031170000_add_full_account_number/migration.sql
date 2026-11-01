ALTER TABLE "Account"
ADD COLUMN "accountNumber" TEXT;

WITH numbered_accounts AS (
  SELECT
    "id",
    lpad(row_number() OVER (ORDER BY "id")::text, 10, '0') AS digits
  FROM "Account"
)
UPDATE "Account" AS account
SET "accountNumber" =
  '001-' || substring(numbered_accounts.digits, 1, 1) || '-' ||
  substring(numbered_accounts.digits, 2, 4) || '-' ||
  substring(numbered_accounts.digits, 6, 4) || '-' ||
  substring(numbered_accounts.digits, 10, 1)
FROM numbered_accounts
WHERE account."id" = numbered_accounts."id";

ALTER TABLE "Account"
ALTER COLUMN "accountNumber" SET NOT NULL;

CREATE UNIQUE INDEX "Account_accountNumber_key"
ON "Account"("accountNumber");
