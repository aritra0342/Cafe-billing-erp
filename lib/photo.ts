// Menu item photos: shared limits and checks. The browser crops and shrinks a photo before upload (components/item-photo.tsx).

/** The bucket also enforces this. A 480 px WebP is usually 20–60 KB. */
export const MAX_PHOTO_BYTES = 1_000_000;
/** Photos are stored square, at this many pixels a side: sharp on a 2x screen at tile size. */
export const PHOTO_SIZE = 480;

export type ImageKind = "webp" | "jpg" | "png";
export const IMAGE_TYPES: Record<ImageKind, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };

/** Reads the image type from the file's first bytes, not its name or the type the browser claims. */
export async function imageKind(blob: Blob): Promise<ImageKind | null> {
  return imageKindOf(new Uint8Array(await blob.slice(0, 12).arrayBuffer()));
}

export function imageKindOf(b: Uint8Array): ImageKind | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}
