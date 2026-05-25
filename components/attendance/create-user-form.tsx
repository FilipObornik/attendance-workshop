"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{
    id: string;
    name: string;
    barcodeToken: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Could not create user");
      return;
    }
    const data = await res.json();
    setCreated(data.user);
    setName("");
    setEmail("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create user"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {created && (
        <div className="rounded-md border bg-muted/50 p-3 text-sm">
          <p>
            Created <strong>{created.name}</strong>. Token:{" "}
            <code className="text-xs">{created.barcodeToken}</code>
          </p>
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <Link href={`/admin/users/${created.id}`}>View barcode →</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
