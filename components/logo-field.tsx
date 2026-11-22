"use client";

import { useRef, useState, useTransition } from "react";
import { setLogo } from "@/lib/actions/settings";
import { LOGO_BOX, LOGO_MAX_CHARS, fitWithin, knockOutBackground, visibleBounds } from "@/lib/logo-image";
import { Button } from "./ui";

async function prepare(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  // Work on a copy no bigger than 1600px; the pixel loops stay quick on phones.
  const src = fitWithin(bitmap.width, bitmap.height, 1600, 1600);
  const work = document.createElement("canvas");
  Object.assign(work, src);
  const wctx = work.getContext("2d", { willReadFrequently: true })!;
  wctx.drawImage(bitmap, 0, 0, src.width, src.height);
  bitmap.close();
  const img = wctx.getImageData(0, 0, src.width, src.height);
  knockOutBackground(img);
  wctx.putImageData(img, 0, 0);
  const crop = visibleBounds(img);

  for (let scale = 1; scale > 0.2; scale *= 0.75) {
    const out = fitWithin(crop.width, crop.height, LOGO_BOX.width * scale, LOGO_BOX.height * scale);
    const canvas = document.createElement("canvas");
    Object.assign(canvas, out);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(work, crop.x, crop.y, crop.width, crop.height, 0, 0, out.width, out.height);
    // WebP keeps transparency at a fraction of PNG's size; browsers without a WebP encoder return PNG.
    const url = canvas.toDataURL("image/webp", 0.9);
    if (url.length <= LOGO_MAX_CHARS) return url;
  }
  throw new Error("too large");
}

export function LogoField({ initial, enabled }: { initial: string; enabled: boolean }) {
  const [logo, setLocal] = useState(initial);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const save = (next: string) =>
    start(async () => {
      const r = await setLogo(next || null);
      if (r.error) setError(r.error);
      else setLocal(next);
    });

  const onFile = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError("Upload a PNG, JPG or WebP image.");
    start(async () => {
      try {
        const url = await prepare(file);
        const r = await setLogo(url);
        if (r.error) setError(r.error);
        else setLocal(url);
      } catch {
        setError("That image couldn't be read. Try saving it as a PNG first.");
      }
    });
  };

  return (
    <div className="grid gap-4">
      <div className="grid min-h-36 place-items-center rounded-xl border-2 border-dashed border-line bg-white p-5">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Your logo, as it prints on bills" className="max-h-28 max-w-full object-contain" />
        ) : (
          <p className="text-center text-[#5b628a]">No logo yet. Bills show your café name only.</p>
        )}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={!enabled || busy} onClick={() => input.current?.click()}>
          {busy ? "Saving logo…" : logo ? "Replace logo" : "Upload logo"}
        </Button>
        {logo && (
          <Button type="button" variant="danger" disabled={busy} onClick={() => save("")}>
            Remove logo
          </Button>
        )}
        {!enabled && <span className="text-ink-2">Save your café details first, then add the logo.</span>}
      </div>
      {error && (
        <p role="alert" className="text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
