// Invoice template library metadata. Layout components live in components/invoice-templates.

export type TemplateMeta = {
  id: string;
  name: string;
  description: string;
  paper: "A4" | "A5" | "80mm" | "58mm";
  /** @page rule applied while this template is printed. */
  pageCss: string;
  /** Width the template renders at on screen (CSS length). */
  width: string;
  /** Finishes the sentence "Based on …". */
  inspiredBy: string;
  /** Where an open-source layout came from; its licence notice is in THIRD_PARTY_NOTICES.md. */
  source?: string;
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    name: "Classic GST invoice",
    description: "A full A4 tax invoice with every Rule 46 field, the SAC code, CGST and SGST shown as separate lines, and the amount in words. Use it for corporate customers and anyone who asks for a proper bill.",
    paper: "A4",
    pageCss: "@page { size: A4; margin: 12mm; }",
    width: "186mm",
    inspiredBy: "the Rule 46 field checklist in Tally's GST invoice guide",
  },
  {
    id: "thermal80",
    name: "Counter receipt (80mm)",
    description: "The standard POS receipt for 3-inch thermal printers. Monospaced, with dashed rules, and a UPI QR code at the bottom for quick payment.",
    paper: "80mm",
    pageCss: "@page { size: 80mm 200mm; margin: 0; }", // height is measured and replaced at print time
    width: "80mm",
    inspiredBy: "Petpooja-style counter bills",
  },
  {
    id: "thermal58",
    name: "Compact receipt (58mm)",
    description: "A narrow receipt for 2-inch Bluetooth printers, common at kiosks and small takeaway counters.",
    paper: "58mm",
    pageCss: "@page { size: 58mm 200mm; margin: 0; }",
    width: "58mm",
    inspiredBy: "handheld billing printer receipts",
  },
  {
    id: "modern",
    name: "Modern café",
    description: "A clean A5 bill in your brand colour, with veg and non-veg marks on each line. Good for dine-in tables and for sending on WhatsApp.",
    paper: "A5",
    pageCss: "@page { size: A5; margin: 10mm; }",
    width: "128mm",
    inspiredBy: "minimal invoice layouts from boutique cafés",
  },
  {
    id: "gstboxed",
    name: "Ruled tax invoice",
    description: "A fully boxed A4 invoice in the style accountants expect: letterhead, seller and buyer side by side, a ruled particulars table, an HSN/SAC tax summary, and declaration and signature panels.",
    paper: "A4",
    pageCss: "@page { size: A4; margin: 10mm; }",
    width: "190mm",
    inspiredBy: "an MIT-licensed GST invoice template by Nitin on Hugging Face",
    source: "https://huggingface.co/spaces/Nra/sbn_invoice/blob/main/Invoice_visualpath.html",
  },
  {
    id: "simple",
    name: "Simple invoice",
    description: "One light box with your name large at the top, grey heading bars and hairline rows. Quiet enough to email to a customer who wants a receipt for expenses.",
    paper: "A4",
    pageCss: "@page { size: A4; margin: 12mm; }",
    width: "186mm",
    inspiredBy: "Sparksuite's MIT-licensed simple HTML invoice template",
    source: "https://github.com/sparksuite/simple-html-invoice-template",
  },
];

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
