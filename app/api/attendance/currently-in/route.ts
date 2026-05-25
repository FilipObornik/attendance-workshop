import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { attendanceLogs, users } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const latest = db
    .select({
      userId: attendanceLogs.userId,
      lastType: sql<string>`(array_agg(${attendanceLogs.type} ORDER BY ${attendanceLogs.timestamp} DESC))[1]`.as(
        "last_type",
      ),
      lastTime: sql<Date>`max(${attendanceLogs.timestamp})`.as("last_time"),
    })
    .from(attendanceLogs)
    .groupBy(attendanceLogs.userId)
    .as("latest");

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      since: latest.lastTime,
    })
    .from(latest)
    .innerJoin(users, eq(users.id, latest.userId))
    .where(and(eq(latest.lastType, "entry"), isNull(users.deletedAt)));

  return NextResponse.json({ currentlyIn: rows });
}
