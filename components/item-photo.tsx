"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_PHOTO_BYTES, PHOTO_SIZE } from "@/lib/photo";
import { Button } from "./ui";

/** Crops a phone photo to a centred square and shrinks it to PHOTO_SIZE, as WebP (JPEG where the browser can't write WebP). */
export async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(PHOTO_SIZE, side);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await encode("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.85);
  if (!blob || blob.size > MAX_PHOTO_BYTES) throw new Error("too large");
  return blob;
}

export type PhotoChange = { kind: "keep" } | { kind: "new"; blob: Blob } | { kind: "remove" };

/** Photo picker for the item editor. Nothing is uploaded until the item is saved. */
export function ItemPhotoField({ current, name, onChange }: { current: string; name: string; onChange: (c: PhotoChange) => void }) {
  const [preview, setPreview] = useState<string>(current ? `/menu/photo/${current}` : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  const pick = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose a photo (JPG, PNG or WebP).");
    setBusy(true);
    try {
      const blob = await preparePhoto(file);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setPreview(objectUrl.current);
      onChange({ kind: "new", blob });
    } catch {
      setError("That photo couldn't be read. Try a JPG from your phone's camera.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="grid gap-1.5">
      <span className="label">Photo</span>
      <div className="flex items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2 text-center text-[0.8125rem] text-ink-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`Photo of ${name || "this item"}`} className="size-full object-cover" />
          ) : (
            "No photo"
          )}
        </div>
        <div className="grid justify-items-start gap-2">
          <input ref={input} type="file" accept="image/*" className="sr-only" id="item-photo" onChange={(e) => pick(e.target.files?.[0])} />
          <label htmlFor="item-photo" className="press inline-flex h-10 cursor-pointer items-center rounded-md border border-line px-3.5 font-[560] hover:border-ink-3">
            {busy ? "Preparing…" : preview ? "Change photo" : "Add a photo"}
          </label>
          {preview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview("");
                onChange({ kind: current ? "remove" : "keep" });
              }}
            >
              Remove photo
            </Button>
          )}
        </div>
      </div>
      <p className="text-[0.875rem] text-ink-3">Shows on the counter so staff find the item at a glance. It&apos;s cropped to a square and doesn&apos;t print on bills.</p>
      {error && (
        <p role="alert" className="text-[0.875rem] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
