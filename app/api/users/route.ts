import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { desc, isNull } from "drizzle-orm";
import { generateBarcodeToken } from "@/lib/tokens";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const CreateUser = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
});

async function requireAdminApi() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  const rows = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.createdAt));
  return NextResponse.json({ users: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateUser.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      barcodeToken: generateBarcodeToken(),
    })
    .returning();

  return NextResponse.json({ user: created }, { status: 201 });
}
