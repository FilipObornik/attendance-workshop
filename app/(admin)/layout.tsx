import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3 text-sm">
          <Link href="/admin" className="font-semibold">
            Attendance Admin
          </Link>
          <Link href="/admin" className="text-slate-600 hover:text-slate-900">
            Users
          </Link>
          <Link
            href="/admin/dashboard"
            className="text-slate-600 hover:text-slate-900"
          >
            Dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
