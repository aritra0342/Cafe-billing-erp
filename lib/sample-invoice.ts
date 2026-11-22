import { computeTotals, financialYear, formatInvoiceNumber, type BilledLine, type Business, type InvoiceDoc, type TaxMode } from "./billing";

/** A realistic demo bill used to preview templates before a café has any of its own. */
export function sampleInvoice(
  business: Partial<Business> & { invoicePrefix?: string; taxMode?: TaxMode; gstRate?: number; pricesIncludeTax?: boolean } = {},
  at: Date = new Date(),
): InvoiceDoc {
  const lines: BilledLine[] = [
    { name: "Cappuccino", variant: "Large", addons: [{ name: "Extra shot", price: 40 }], diet: "veg", unitPrice: 220, qty: 2, amount: 440 },
    { name: "Masala Chai", variant: "Kulhad", addons: [], diet: "veg", unitPrice: 60, qty: 1, amount: 60 },
    { name: "Chicken Tikka Sandwich", addons: [], diet: "nonveg", unitPrice: 240, qty: 1, amount: 240 },
    { name: "Egg Croissant", addons: [{ name: "Cheese", price: 30 }], diet: "egg", unitPrice: 190, qty: 1, amount: 190 },
  ];
  const taxMode = business.taxMode ?? "regular";
  const gstRate = business.gstRate ?? 5;
  const totals = computeTotals({ lines, discountType: "percent", discountValue: 10, taxMode, gstRate, pricesIncludeTax: business.pricesIncludeTax ?? false });
  const issuedAt = at.toISOString();
  return {
    id: "sample",
    number: formatInvoiceNumber(business.invoicePrefix || "INV", financialYear(at), 42),
    issuedAt,
    customerName: "Ananya Rao",
    customerPhone: "98450 12345",
    customerGstin: "",
    customerAddress: "",
    orderType: "dine_in",
    tableNo: "T4",
    paymentMode: "upi",
    status: "paid",
    paidAt: issuedAt,
    templateId: "classic",
    lines,
    discountType: "percent",
    discountValue: 10,
    taxMode,
    gstRate,
    pricesIncludeTax: business.pricesIncludeTax ?? false,
    notes: "",
    business: {
      cafeName: business.cafeName || "Third Wave Corner",
      legalName: business.legalName || "",
      address: business.address || "Shop 4, 12th Main Road, Indiranagar",
      city: business.city || "Bengaluru",
      pincode: business.pincode || "560038",
      stateCode: business.stateCode || "29",
      phone: business.phone || "080 4123 4567",
      email: business.email || "",
      gstin: business.gstin || (taxMode === "unregistered" ? "" : "29ABCDE1234F1Z5"),
      fssai: business.fssai || "11223344556677",
      upiId: business.upiId || "thirdwave@okhdfcbank",
      footerNote: business.footerNote || "Thank you for visiting! See you again soon.",
      accentColor: business.accentColor || "#1b2459",
    },
    ...totals,
  };
}
