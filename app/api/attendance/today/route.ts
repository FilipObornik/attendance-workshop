import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { attendanceLogs, users } from "@/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      id: attendanceLogs.id,
      type: attendanceLogs.type,
      timestamp: attendanceLogs.timestamp,
      userId: attendanceLogs.userId,
      userName: users.name,
    })
    .from(attendanceLogs)
    .innerJoin(users, eq(users.id, attendanceLogs.userId))
    .where(gte(attendanceLogs.timestamp, start))
    .orderBy(desc(attendanceLogs.timestamp));

  return NextResponse.json({ logs: rows });
}
