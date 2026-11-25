"use server";

import { settingsChanged } from "../cache-tags";
import { tables } from "../appwrite/server";
import { requireUser } from "../auth";
import { DEFAULT_SETTINGS, getSettingsFor, type CafeSettings } from "../data";
import { FSSAI_RE, GSTIN_RE, STATES } from "../billing";
import { TEMPLATE_IDS } from "../templates";
import { LOGO_MAX_CHARS } from "../logo-image";

export type SettingsResult = { ok: true } | { ok: false; errors: Partial<Record<keyof CafeSettings, string>> };

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export async function saveSettings(input: CafeSettings): Promise<SettingsResult> {
  const user = await requireUser();
  const s: CafeSettings = {
    cafeName: clip(input.cafeName, 128),
    legalName: clip(input.legalName, 128),
    address: clip(input.address, 512),
    city: clip(input.city, 64),
    pincode: clip(input.pincode, 10),
    stateCode: clip(input.stateCode, 2),
    phone: clip(input.phone, 20),
    email: clip(input.email, 128),
    gstin: clip(input.gstin, 15).toUpperCase(),
    fssai: clip(input.fssai, 14),
    taxMode: ["regular", "composition", "unregistered"].includes(input.taxMode) ? input.taxMode : "regular",
    gstRate: Math.min(28, Math.max(0, Number(input.gstRate) || 0)),
    pricesIncludeTax: Boolean(input.pricesIncludeTax),
    invoicePrefix: clip(input.invoicePrefix, 5).toUpperCase().replace(/[^A-Z0-9]/g, "") || "INV",
    upiId: clip(input.upiId, 64),
    footerNote: clip(input.footerNote, 512),
    defaultTemplate: TEMPLATE_IDS.includes(input.defaultTemplate) ? input.defaultTemplate : "classic",
    accentColor: /^#[0-9a-fA-F]{6}$/.test(input.accentColor) ? input.accentColor : DEFAULT_SETTINGS.accentColor,
  };

  const errors: Partial<Record<keyof CafeSettings, string>> = {};
  if (!s.cafeName) errors.cafeName = "Your cafe needs a name for the bill header.";
  if (s.stateCode && !STATES.some((st) => st.code === s.stateCode)) errors.stateCode = "Pick a state.";
  if (s.pincode && !/^[1-9][0-9]{5}$/.test(s.pincode)) errors.pincode = "PIN codes are 6 digits.";
  if (s.fssai && !FSSAI_RE.test(s.fssai)) errors.fssai = "FSSAI numbers are 14 digits.";
  if (s.taxMode !== "unregistered") {
    if (!s.gstin) errors.gstin = "A GSTIN is required for GST-registered cafes.";
    else if (!GSTIN_RE.test(s.gstin)) errors.gstin = "That doesn't look like a valid 15-character GSTIN.";
    else if (s.stateCode && s.gstin.slice(0, 2) !== s.stateCode) errors.gstin = "The GSTIN's first two digits should match your state code.";
  }
  if (s.upiId && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(s.upiId)) errors.upiId = "UPI IDs look like name@bank.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const existing = await getSettingsFor(user.id);
  if (existing) await tables.settings.update(user.id, s);
  else await tables.settings.create({ ownerId: user.id, ...s }, { rowId: user.id });
  await settingsChanged();
  return { ok: true };
}

export async function setDefaultTemplate(templateId: string) {
  const user = await requireUser();
  if (!TEMPLATE_IDS.includes(templateId)) return;
  const existing = await getSettingsFor(user.id);
  if (!existing) return;
  await tables.settings.update(user.id, { defaultTemplate: templateId });
  await settingsChanged();
}

const LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/** Saves the bill logo. The browser has already trimmed and resized it; null removes it. */
export async function setLogo(dataUrl: string | null): Promise<{ error?: string }> {
  const user = await requireUser();
  const logo = dataUrl ?? "";
  if (logo && !LOGO_RE.test(logo)) return { error: "Upload a PNG, JPG or WebP image." };
  if (logo.length > LOGO_MAX_CHARS) return { error: "That image is too large even after shrinking. Try a simpler logo." };
  const existing = await getSettingsFor(user.id);
  if (!existing) return { error: "Save your cafe details first, then add the logo." };
  await tables.settings.update(user.id, { logo });
  await settingsChanged();
  return {};
}
