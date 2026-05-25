"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarcodeScanner,
  type PermissionState,
} from "@/components/scan/barcode-scanner";
import { shouldAcceptScan } from "@/lib/scan-debounce";

type ScanResult =
  | { kind: "ok"; type: "entry" | "exit"; at: string }
  | { kind: "error"; message: string };

export default function ScanPage() {
  const [token, setToken] = useState("");
  const [type, setType] = useState<"entry" | "exit">("entry");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [permission, setPermission] = useState<PermissionState>("pending");
  const [lastAccepted, setLastAccepted] = useState<{
    token: string;
    at: number;
  } | null>(null);

  const submitScan = useCallback(
    async (scannedToken: string, scanType: "entry" | "exit") => {
      setSubmitting(true);
      setResult(null);
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: scannedToken, type: scanType }),
        });
        if (!res.ok) {
          setResult({ kind: "error", message: "Invalid code" });
          return;
        }
        const data = (await res.json()) as {
          type: "entry" | "exit";
          at: string;
        };
        setResult({ kind: "ok", type: data.type, at: data.at });
      } catch {
        setResult({ kind: "error", message: "Invalid code" });
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const handleDecode = useCallback(
    (decoded: string) => {
      if (submitting) return;
      const now = Date.now();
      if (!shouldAcceptScan(decoded, now, lastAccepted)) return;
      setLastAccepted({ token: decoded, at: now });
      void submitScan(decoded, type);
    },
    [submitting, lastAccepted, type, submitScan],
  );

  async function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitScan(token, type);
    setToken("");
  }

  const cameraActive = permission === "granted";
  const cameraUnavailable =
    permission === "denied" || permission === "unsupported";

  return (
    <main className="mx-auto max-w-md p-10">
      <Card>
        <CardHeader>
          <CardTitle>Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "entry" ? "default" : "outline"}
                  onClick={() => setType("entry")}
                  disabled={submitting}
                >
                  Entry
                </Button>
                <Button
                  type="button"
                  variant={type === "exit" ? "default" : "outline"}
                  onClick={() => setType("exit")}
                  disabled={submitting}
                >
                  Exit
                </Button>
              </div>
            </div>

            {!cameraUnavailable && (
              <div className="space-y-1">
                <Label>Camera</Label>
                <BarcodeScanner
                  onDecode={handleDecode}
                  onPermissionChange={setPermission}
                  paused={submitting}
                />
                {permission === "pending" && (
                  <p className="text-xs text-slate-500">
                    Requesting camera…
                  </p>
                )}
                {cameraActive && (
                  <p className="text-xs text-slate-500">
                    Point a barcode at the camera.
                  </p>
                )}
              </div>
            )}

            {cameraUnavailable && (
              <form onSubmit={onManualSubmit} className="space-y-4">
                <p className="text-xs text-slate-500">
                  Camera unavailable — enter token manually.
                </p>
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
                <Button
                  type="submit"
                  disabled={submitting || !token}
                  className="w-full"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </form>
            )}
          </div>

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
