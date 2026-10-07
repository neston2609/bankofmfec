import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
const outputPath = process.argv[2];

if (!connectionString || !outputPath) {
  throw new Error("Usage: DATABASE_URL=... node backup-database-json.mjs <output>");
}

const client = new Client({ connectionString });
try {
  await client.connect();
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const tableResult = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const backup = {
    format: "demohub24-json-backup-v1",
    createdAt: new Date().toISOString(),
    tables: {},
  };
  for (const { tablename } of tableResult.rows) {
    const safeName = tablename.replaceAll('"', '""');
    const rows = await client.query(`SELECT * FROM "${safeName}"`);
    backup.tables[tablename] = rows.rows;
  }
  await client.query("COMMIT");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));
  console.log(outputPath);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
