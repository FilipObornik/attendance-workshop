import { describe, it, expect } from "vitest";
import { renderBarcodePng } from "@/lib/barcode";

describe("renderBarcodePng", () => {
  it("returns a PNG data URL", async () => {
    const out = await renderBarcodePng("abc123def456");
    expect(out.startsWith("data:image/png;base64,")).toBe(true);
    expect(out.length).toBeGreaterThan(100);
  });

  it("rejects empty tokens", async () => {
    await expect(renderBarcodePng("")).rejects.toThrow();
  });
});
