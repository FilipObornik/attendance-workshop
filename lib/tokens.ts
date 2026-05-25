import { randomBytes } from "node:crypto";

export function generateBarcodeToken(): string {
  return randomBytes(12).toString("hex");
}
