export const SCAN_DEBOUNCE_MS = 5000;

export function shouldAcceptScan(
  token: string,
  now: number,
  lastAccepted: { token: string; at: number } | null,
): boolean {
  if (lastAccepted === null) return true;
  if (lastAccepted.token !== token) return true;
  return now - lastAccepted.at >= SCAN_DEBOUNCE_MS;
}
