import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const url =
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:54322/postgres";
  const sql = postgres(url, { prepare: false, max: 1 });
  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  await sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;

  for (const file of files) {
    const applied =
      await sql`SELECT 1 FROM _migrations WHERE name = ${file} LIMIT 1`;
    if (applied.length > 0) {
      console.log(`skip  ${file}`);
      continue;
    }
    const content = readFileSync(join(dir, file), "utf8");
    console.log(`apply ${file}`);
    // Wrap each migration in a transaction so partial failures roll back.
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
  }

  await sql.end();
  console.log("migrations complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
