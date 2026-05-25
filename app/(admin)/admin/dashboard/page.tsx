import { db } from "@/db/client";
import { attendanceLogs, users } from "@/db/schema";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { CurrentlyInCard } from "@/components/attendance/currently-in-card";
import { LogList } from "@/components/attendance/log-list";

export default async function DashboardPage() {
  await requireAdmin();

  // "Currently in" = users whose latest log is an entry
  const latestPerUser = db
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

  const currentlyIn = await db
    .select({
      id: users.id,
      name: users.name,
      since: latestPerUser.lastTime,
    })
    .from(latestPerUser)
    .innerJoin(users, eq(users.id, latestPerUser.userId))
    .where(and(eq(latestPerUser.lastType, "entry"), isNull(users.deletedAt)));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaysLogs = await db
    .select({
      id: attendanceLogs.id,
      type: attendanceLogs.type,
      timestamp: attendanceLogs.timestamp,
      userName: users.name,
    })
    .from(attendanceLogs)
    .innerJoin(users, eq(users.id, attendanceLogs.userId))
    .where(gte(attendanceLogs.timestamp, startOfDay))
    .orderBy(desc(attendanceLogs.timestamp));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CurrentlyInCard items={currentlyIn} />
      <LogList logs={todaysLogs} />
    </div>
  );
}
