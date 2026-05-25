import { describe, it, expect } from "vitest";
import { shouldAcceptScan, SCAN_DEBOUNCE_MS } from "@/lib/scan-debounce";

describe("shouldAcceptScan", () => {
  it("accepts first scan when lastAccepted is null", () => {
    expect(shouldAcceptScan("abc", 1000, null)).toBe(true);
  });

  it("rejects same token within debounce window", () => {
    expect(
      shouldAcceptScan("abc", 1000 + SCAN_DEBOUNCE_MS - 1, {
        token: "abc",
        at: 1000,
      }),
    ).toBe(false);
  });

  it("accepts same token at exactly the debounce boundary", () => {
    expect(
      shouldAcceptScan("abc", 1000 + SCAN_DEBOUNCE_MS, {
        token: "abc",
        at: 1000,
      }),
    ).toBe(true);
  });

  it("accepts a different token within the debounce window", () => {
    expect(
      shouldAcceptScan("xyz", 1500, { token: "abc", at: 1000 }),
    ).toBe(true);
  });
});
