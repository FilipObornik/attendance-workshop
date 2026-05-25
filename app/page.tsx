import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-10">
      <h1 className="text-3xl font-bold">Attendance Workshop</h1>
      <p className="text-slate-600">
        Pick a surface. Admin is auth&apos;d; the scanner page is public.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/admin" className="hover:underline">
                Admin →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Users, dashboard, barcode generation.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/scan" className="hover:underline">
                Scan →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Public token entry. Entry / Exit.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
