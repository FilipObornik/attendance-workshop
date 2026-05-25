import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { attendanceLogs, users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

const ScanInput = z.object({
  token: z.string().min(1),
  type: z.enum(["entry", "exit"]),
});

// PUBLIC endpoint. Never leak whether a token exists; never echo PII.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ScanInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.barcodeToken, parsed.data.token), isNull(users.deletedAt)),
    )
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const [log] = await db
    .insert(attendanceLogs)
    .values({ userId: user.id, type: parsed.data.type })
    .returning({ type: attendanceLogs.type, timestamp: attendanceLogs.timestamp });

  return NextResponse.json({
    type: log.type,
    at: log.timestamp.toISOString(),
  });
}
