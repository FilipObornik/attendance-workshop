import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { renderBarcodePng } from "@/lib/barcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);

  if (!user) notFound();

  const barcodeDataUrl = await renderBarcodePng(user.barcodeToken);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-slate-500">Email: </span>
            {user.email}
          </div>
          <div>
            <span className="text-slate-500">Token: </span>
            <code>{user.barcodeToken}</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Barcode</CardTitle>
        </CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={barcodeDataUrl}
            alt={`barcode for ${user.name}`}
            className="max-w-md"
          />
        </CardContent>
      </Card>
    </div>
  );
}
