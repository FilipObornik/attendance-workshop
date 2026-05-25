import { db } from "@/db/client";
import { users } from "@/db/schema";
import { desc, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { UserTable } from "@/components/attendance/user-table";
import { CreateUserForm } from "@/components/attendance/create-user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminUsersPage() {
  await requireAdmin();
  const rows = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable users={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
