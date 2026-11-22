import { getTemplate } from "@/lib/templates";
import { ClassicTemplate } from "./classic";
import { GstBoxedTemplate } from "./gst-boxed";
import { ModernTemplate } from "./modern";
import { SimpleTemplate } from "./simple";
import { ThermalTemplate } from "./thermal";
import type { TemplateProps } from "./shared";

export function InvoicePaper({ templateId, doc, qr, className = "" }: TemplateProps & { templateId: string; className?: string }) {
  const t = getTemplate(templateId);
  return (
    <div className={`print-paper mx-auto overflow-hidden bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08),0_24px_48px_-24px_rgb(0_0_0/0.35)] ${className}`} style={{ width: t.width }}>
      {t.id === "thermal80" && <ThermalTemplate doc={doc} qr={qr} />}
      {t.id === "thermal58" && <ThermalTemplate doc={doc} qr={qr} narrow />}
      {t.id === "modern" && <ModernTemplate doc={doc} qr={qr} />}
      {t.id === "classic" && <ClassicTemplate doc={doc} qr={qr} />}
      {t.id === "gstboxed" && <GstBoxedTemplate doc={doc} qr={qr} />}
      {t.id === "simple" && <SimpleTemplate doc={doc} qr={qr} />}
    </div>
  );
}
