import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const client = new Client({ connectionString });

const relationships = [
  "Account",
  "Card",
  "Loan",
  "Payment",
  "FraudAlert",
  "Offer",
  "ProductApplication",
  "Investment",
  "Notification",
  "AuditLog",
];

async function moveRelationships(fromId, toId) {
  for (const table of relationships) {
    await client.query(
      `UPDATE "${table}" SET "customerId" = $1 WHERE "customerId" = $2`,
      [toId, fromId],
    );
  }
  for (const table of ["BankingCredential", "MobileBanking"]) {
    const target = await client.query(
      `SELECT 1 FROM "${table}" WHERE "customerId" = $1`,
      [toId],
    );
    if (target.rowCount) {
      await client.query(`DELETE FROM "${table}" WHERE "customerId" = $1`, [
        fromId,
      ]);
    } else {
      await client.query(
        `UPDATE "${table}" SET "customerId" = $1 WHERE "customerId" = $2`,
        [toId, fromId],
      );
    }
  }
  await client.query(`DELETE FROM "Customer" WHERE "id" = $1`, [fromId]);
}

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(
    `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "idNumber" TEXT NOT NULL DEFAULT 'XXXXXXXXXXX'`,
  );

  const duplicateGroups = await client.query(`
    SELECT LOWER(BTRIM("englishName")) AS normalized_name,
           ARRAY_AGG("id" ORDER BY
             CASE WHEN "id" ~ '^CUST[0-9]+$' THEN 0 ELSE 1 END,
             "createdAt",
             "id") AS ids
    FROM "Customer"
    GROUP BY LOWER(BTRIM("englishName"))
    HAVING COUNT(*) > 1
  `);

  let removed = 0;
  for (const group of duplicateGroups.rows) {
    const [keepId, ...duplicateIds] = group.ids;
    for (const duplicateId of duplicateIds) {
      await moveRelationships(duplicateId, keepId);
      removed += 1;
    }
  }

  await client.query(`
    UPDATE "Customer"
    SET "idNumber" = 'XXXXXXXXXXX'
    WHERE "idNumber" IS NULL OR BTRIM("idNumber") = ''
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Customer_englishName_key"
    ON "Customer" ("englishName")
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Customer_englishName_ci_key"
    ON "Customer" (LOWER(BTRIM("englishName")))
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Customer_thaiName_ci_key"
    ON "Customer" (LOWER(BTRIM("thaiName")))
  `);
  await client.query("COMMIT");
  console.log(JSON.stringify({ duplicateCustomersRemoved: removed }));
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
