import { db } from "./client";
import { users, attendanceLogs } from "./schema";
import { sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";

function token() {
  return randomBytes(12).toString("hex");
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function ensureAdminUser() {
  if (!SERVICE_ROLE_KEY) {
    console.warn(
      "  ! SUPABASE_SERVICE_ROLE_KEY not set — skipping admin auth user creation.",
    );
    return;
  }
  const url = `${SUPABASE_URL}/auth/v1/admin/users`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      }),
    });
    if (res.ok) {
      console.log(`  created admin auth user: ${ADMIN_EMAIL}`);
    } else if (res.status === 409 || res.status === 422) {
      // 409 = already exists, 422 = gotrue's "email already registered"
      console.log(`  admin auth user already exists: ${ADMIN_EMAIL}`);
    } else {
      const body = await res.text();
      console.warn(
        `  ! failed to create admin user (HTTP ${res.status}): ${body}`,
      );
    }
  } catch (err) {
    console.warn(
      `  ! could not reach GoTrue at ${SUPABASE_URL} — is docker compose up?`,
      err instanceof Error ? err.message : err,
    );
  }
}

async function main() {
  console.warn(
    "! seed is destructive: wiping attendance_logs and users before reseeding.",
  );

  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM attendance_logs`);
    await tx.execute(sql`DELETE FROM users`);

    console.log("seeding users…");
    const inserted = await tx
      .insert(users)
      .values([
        { name: "Ada Lovelace", email: "ada@example.com", barcodeToken: token() },
        { name: "Alan Turing", email: "alan@example.com", barcodeToken: token() },
        { name: "Grace Hopper", email: "grace@example.com", barcodeToken: token() },
      ])
      .returning();

    console.log("seeding attendance logs…");
    const now = new Date();
    const earlier = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    await tx.insert(attendanceLogs).values([
      { userId: inserted[0].id, type: "entry", timestamp: earlier },
      { userId: inserted[1].id, type: "entry", timestamp: earlier },
      { userId: inserted[1].id, type: "exit", timestamp: now },
    ]);

    console.log("seed complete:");
    for (const u of inserted) {
      console.log(`  ${u.name}  token=${u.barcodeToken}`);
    }
  });

  console.log("\nensuring admin auth user…");
  await ensureAdminUser();

  console.log(
    `\nAdmin sign-in:\n  email:    ${ADMIN_EMAIL}\n  password: ${ADMIN_PASSWORD}\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
