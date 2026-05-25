import bwipjs from "bwip-js/node";

/**
 * Render a Code128 barcode as a base64 PNG data URL.
 * Used to display a user's barcode_token in the admin UI.
 */
export async function renderBarcodePng(token: string): Promise<string> {
  if (!token || token.length === 0) {
    throw new Error("token is required");
  }
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: token,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  });
  return `data:image/png;base64,${png.toString("base64")}`;
}
