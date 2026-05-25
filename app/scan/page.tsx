"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ScanResult =
  | { kind: "ok"; type: "entry" | "exit"; at: string }
  | { kind: "error"; message: string };

export default function ScanPage() {
  const [token, setToken] = useState("");
  const [type, setType] = useState<"entry" | "exit">("entry");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, type }),
      });
      if (!res.ok) {
        setResult({ kind: "error", message: "Invalid code" });
        return;
      }
      const data = (await res.json()) as { type: "entry" | "exit"; at: string };
      setResult({ kind: "ok", type: data.type, at: data.at });
      setToken("");
    } catch {
      setResult({ kind: "error", message: "Invalid code" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-10">
      <Card>
        <CardHeader>
          <CardTitle>Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="paste your barcode token"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "entry" ? "default" : "outline"}
                  onClick={() => setType("entry")}
                >
                  Entry
                </Button>
                <Button
                  type="button"
                  variant={type === "exit" ? "default" : "outline"}
                  onClick={() => setType("exit")}
                >
                  Exit
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !token}
              className="w-full"
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </form>

          {result && (
            <div
              role="status"
              data-testid="scan-result"
              className="mt-6 rounded-md border p-4 text-center"
            >
              {result.kind === "ok" ? (
                <>
                  <div className="text-lg font-semibold">
                    {result.type === "entry" ? "Welcome back" : "Goodbye"}
                  </div>
                  <div className="text-xs text-slate-500">{result.at}</div>
                </>
              ) : (
                <div className="font-semibold text-red-600">
                  {result.message}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
