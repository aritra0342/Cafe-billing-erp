"use client";

import Link from "@/components/link";
import { useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import {
  computeTotals,
  formatINR,
  GSTIN_RE,
  lineUnitPrice,
  type BilledLine,
  type CartLineInput,
  type Category,
  type Diet,
  type DiscountType,
  type MenuItem,
  type OrderType,
  type PaymentMode,
  type PaymentStatus,
  type TaxMode,
} from "@/lib/billing";
import { TEMPLATES } from "@/lib/templates";
import { Button, DietMark, Field, Input, Segmented, Select, Textarea, buttonClass } from "./ui";
import { IconClose, IconMinus, IconPlus, IconSearch } from "./icons";
import { NEW_SPLIT, SplitFields, splitParts } from "./split-fields";

type CartLine = {
  key: string;
  input: CartLineInput;
  /** The menu item, so its tile shows how many are on the bill. */
  itemId?: string;
  name: string;
  detail: string;
  diet?: Diet;
  unitPrice: number;
};

type BillingConfig = { cafeName: string; taxMode: TaxMode; gstRate: number; pricesIncludeTax: boolean; defaultTemplate: string };

/** A saved bill opened for editing. Its lines stay at the prices they were billed at. */
export type EditingBill = {
  id: string;
  number: string;
  status: PaymentStatus;
  paymentMode: PaymentMode;
  /** How the bill was paid, in words: "UPI", or "Cash ₹200 + UPI ₹150" for a mixed payment. */
  paidBy: string;
  lines: BilledLine[];
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  orderType: OrderType;
  tableNo: string;
  discountType: DiscountType;
  discountValue: number;
  notes: string;
  /** Fingerprint of the saved lines this edit starts from; the server refuses the edit if they've changed. */
  revision: string;
};

const billedDetail = (l: BilledLine) => [l.variant, ...l.addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(", ");

const fromBill = (bill: EditingBill): CartLine[] =>
  bill.lines.map((l, index) => ({
    key: `billed|${index}`,
    input: { kind: "billed", index, qty: l.qty },
    itemId: l.itemId,
    name: l.name,
    detail: billedDetail(l) || (l.itemId || l.diet ? "" : "Off-menu"),
    diet: l.diet,
    unitPrice: l.unitPrice,
  }));

const menuKey = (itemId: string, variantId: string | undefined, addonIds: string[]) => `${itemId}|${variantId ?? ""}|${[...addonIds].sort().join(",")}`;

function priceLabel(item: MenuItem) {
  if (!item.variants.length) return formatINR(item.price).replace(".00", "");
  const prices = item.variants.map((v) => v.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const f = (n: number) => formatINR(n).replace(".00", "");
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi).replace("₹", "")}`;
}

type CounterProps = { categories: Category[]; items: MenuItem[]; config: BillingConfig; editing?: EditingBill };

/**
 * Next.js keeps recently visited pages alive (hidden) and restores their state on return. A draft order should survive
 * a trip to another page, but a saved one must not: it would come back as a duplicate order, or, when editing, as a cart
 * that points at the bill's old line positions. So once a save goes through, the counter starts afresh the next time
 * it's shown. An edit also starts afresh whenever the bill's saved lines change.
 */
export function BillingCounter(props: CounterProps) {
  const [round, setRound] = useState(0);
  return <Counter key={`${props.editing?.revision ?? "new"}:${round}`} {...props} onSavedAndHidden={() => setRound((r) => r + 1)} />;
}

function Counter({ categories, items, config, editing, onSavedAndHidden }: CounterProps & { onSavedAndHidden: () => void }) {
  const [cat, setCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>(() => (editing ? fromBill(editing) : []));
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const pickDialog = useRef<HTMLDialogElement>(null);
  const tillRef = useRef<HTMLDivElement>(null);

  const [customer, setCustomer] = useState({ name: editing?.customerName ?? "", phone: editing?.customerPhone ?? "", gstin: editing?.customerGstin ?? "", address: editing?.customerAddress ?? "" });
  const [showB2B, setShowB2B] = useState(Boolean(editing?.customerGstin || editing?.customerAddress));
  const [orderType, setOrderType] = useState<OrderType>(editing?.orderType ?? "dine_in");
  const [tableNo, setTableNo] = useState(editing?.tableNo ?? "");
  // New bills start as due: the order goes to the kitchen first and is settled later.
  const [status, setStatus] = useState<PaymentStatus>("due");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");
  const [split, setSplit] = useState(NEW_SPLIT);
  const [discountType, setDiscountType] = useState<DiscountType>(editing?.discountType ?? "percent");
  const [discountValue, setDiscountValue] = useState(editing?.discountValue ?? 0);
  const [templateId, setTemplateId] = useState(config.defaultTemplate);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [tried, setTried] = useState(false);
  const tableInput = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState({ name: "", price: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const saved = useRef(false);
  const onHide = useRef(onSavedAndHidden);
  // Runs when the page is hidden after the save's redirect (and on unmount); a draft that was never saved is kept.
  useLayoutEffect(
    () => () => {
      if (saved.current) onHide.current();
    },
    [],
  );

  const q = query.trim().toLowerCase();
  const sections = useMemo(() => {
    const match = (i: MenuItem) => !q || i.name.toLowerCase().includes(q);
    return categories
      .filter((c) => cat === "all" || c.id === cat)
      .map((c) => ({ cat: c, items: items.filter((i) => i.categoryId === c.id && match(i)) }))
      .filter((s) => s.items.length);
  }, [categories, items, cat, q]);

  const totals = useMemo(
    () => computeTotals({ lines: cart.map((l) => ({ unitPrice: l.unitPrice, qty: l.input.qty })), discountType, discountValue, ...config }),
    [cart, discountType, discountValue, config],
  );
  const count = cart.reduce((s, l) => s + l.input.qty, 0);
  const qtyOf = (itemId: string) => cart.reduce((s, l) => s + (l.itemId === itemId ? l.input.qty : 0), 0);

  const addLine = (line: CartLine) =>
    setCart((c) => {
      const i = c.findIndex((l) => l.key === line.key);
      if (i === -1) return [...c, line];
      return c.map((l, j) => (j === i ? { ...l, input: { ...l.input, qty: l.input.qty + line.input.qty } } : l));
    });

  const addMenu = (item: MenuItem, variantId: string | undefined, addonIds: string[], qty = 1) => {
    const variant = item.variants.find((v) => v.id === variantId);
    const addons = item.addons.filter((a) => addonIds.includes(a.id));
    addLine({
      key: menuKey(item.id, variantId, addonIds),
      input: { kind: "menu", itemId: item.id, variantId, addonIds, qty },
      itemId: item.id,
      name: item.name,
      detail: [variant?.name, ...addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(", "),
      diet: item.diet,
      unitPrice: lineUnitPrice(item, variantId, addonIds),
    });
  };

  const tapItem = (item: MenuItem) => {
    if (!item.available) return;
    if (item.variants.length || item.addons.length) {
      setPicking(item);
      requestAnimationFrame(() => pickDialog.current?.showModal());
    } else addMenu(item, undefined, []);
  };

  // The tile's minus takes one off the line this item was last added as.
  const lessOf = (itemId: string) =>
    setCart((c) => {
      const i = c.findLastIndex((l) => l.itemId === itemId);
      if (i === -1) return c;
      const qty = c[i].input.qty - 1;
      return qty <= 0 ? c.filter((_, j) => j !== i) : c.map((l, j) => (j === i ? { ...l, input: { ...l.input, qty } } : l));
    });

  const setQty = (key: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, input: { ...l.input, qty: Math.min(999, qty) } } : l))));

  const addCustom = () => {
    const price = Number(custom.price);
    const name = custom.name.trim();
    if (!name || !(price > 0)) return;
    addLine({ key: `custom|${name}|${price}`, input: { kind: "custom", name, price, qty: 1 }, name, detail: "Off-menu", unitPrice: price });
    setCustom({ name: "", price: "" });
  };

  const gstinInvalid = customer.gstin !== "" && !GSTIN_RE.test(customer.gstin.toUpperCase());
  const taxed = config.taxMode === "regular" && config.gstRate > 0;

  const tableMissing = orderType === "dine_in" && !tableNo.trim();
  const mixed = !editing && status === "paid" && paymentMode === "mixed";
  const splitOver = mixed && splitParts(split, totals.total).over > 0;

  const save = (printSlip: boolean) => {
    setError("");
    setTried(true);
    if (tableMissing) {
      tableInput.current?.focus();
      return;
    }
    const order = {
      lines: cart.map((l) => l.input),
      customerName: customer.name,
      customerPhone: customer.phone,
      customerGstin: customer.gstin.toUpperCase(),
      customerAddress: customer.address,
      orderType,
      tableNo: orderType === "dine_in" ? tableNo : "",
      discountType,
      discountValue,
      notes,
    };
    start(async () => {
      saved.current = true;
      const r = editing ? await updateInvoice(editing.id, { ...order, basedOn: editing.revision }) : await createInvoice({ ...order, status, paymentMode, ...(mixed ? { paymentSplit: splitParts(split, totals.total).parts } : {}), templateId, printSlip });
      if (r?.error) {
        saved.current = false;
        setError(r.error);
      }
    });
  };

  return (
    <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
      {/* ---------- Menu board ---------- */}
      <section aria-label="Menu" className="min-w-0">
        <div className="sticky top-14 z-10 -mx-4 grid gap-3 bg-bg/95 px-4 pt-1 pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-16 lg:mx-0 lg:px-0">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3" />
            <Input type="search" placeholder="Find an item" aria-label="Find an item on the menu" className="h-14 pl-11 text-[1.1875rem]" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Categories">
            {[{ id: "all", name: "Whole menu" }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={cat === c.id}
                onClick={() => setCat(c.id)}
                className={`press h-12 shrink-0 rounded-lg px-4 text-[1.0625rem] font-[600] ${cat === c.id ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {sections.length === 0 ? (
          <p className="py-12 text-ink-2">Nothing on the menu matches “{query}”. Add it below as an off-menu item if you need to bill it.</p>
        ) : (
          <div className="mt-4">
            {sections.map(({ cat: c, items: list }) => (
              <section key={c.id} className="mb-8">
                <h2 className="mb-3 border-b-2 border-rule pb-1.5 text-[1.625rem] leading-tight font-[720] [font-stretch:78%]">{c.name}</h2>
                {/* Big tiles: at a busy counter they're hit fast, with a thumb, from arm's length. */}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
                  {list.map((item) => {
                    const n = qtyOf(item.id);
                    const options = item.variants.length > 0 || item.addons.length > 0;
                    return (
                      <li key={item.id} className="relative">
                        <button
                          type="button"
                          disabled={!item.available}
                          onClick={() => tapItem(item)}
                          aria-label={`${item.name}, ${priceLabel(item)}${options ? ", choose size" : ""}${n ? `, ${n} on bill` : ""}${item.available ? "" : ", sold out"}`}
                          className={`press flex h-full min-h-[11.5rem] w-full flex-col rounded-xl border-2 px-4 pt-4 pb-[4.75rem] text-left transition-[border-color,background-color] disabled:cursor-not-allowed disabled:opacity-60 ${
                            n ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-ink-3 active:bg-accent-soft"
                          }`}
                        >
                          {item.photo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/menu/photo/${item.photo}`} alt="" loading="lazy" decoding="async" className="-mx-1 mb-2.5 aspect-[4/3] w-[calc(100%+0.5rem)] rounded-lg bg-surface-2 object-cover" />
                          )}
                          <span className="flex items-start gap-2">
                            <DietMark diet={item.diet} className="mt-[0.5rem] shrink-0 sm:mt-[0.6rem]" />
                            <span className={`line-clamp-3 text-[1.25rem] leading-[1.2] font-[650] sm:text-[1.4375rem] ${item.available ? "" : "text-ink-3 line-through decoration-bad/70"}`}>{item.name}</span>
                          </span>
                          <span className="mt-auto flex items-baseline justify-between gap-2 pt-2">
                            {item.available ? <span className="money text-[1.5rem] sm:text-[1.625rem]">{priceLabel(item)}</span> : <span className="text-[1.0625rem] font-[650] text-bad">Sold out</span>}
                            {options && item.available && <span className="text-[1rem] text-ink-3">Sizes</span>}
                          </span>
                          {!n && item.available && (
                            <span aria-hidden className="absolute inset-x-2.5 bottom-2.5 flex h-[3.25rem] items-center justify-center gap-2 rounded-lg border border-dashed border-line text-[1.0625rem] font-[650] text-ink-3">
                              <IconPlus className="size-5" />
                              Add
                            </span>
                          )}
                        </button>
                        {n > 0 && (
                          <div className="absolute inset-x-2.5 bottom-2.5 flex h-[3.25rem] items-center justify-between rounded-lg bg-accent text-accent-ink">
                            <button type="button" aria-label={`One less ${item.name}`} onClick={() => lessOf(item.id)} className="press grid h-full w-16 place-items-center rounded-l-lg hover:bg-black/10">
                              <IconMinus className="size-6" />
                            </button>
                            <span className="num text-[1.625rem] font-[750]" aria-live="polite" aria-label={`${n} ${item.name} on bill`}>
                              {n}
                            </span>
                            <button type="button" aria-label={`One more ${item.name}`} onClick={() => tapItem(item)} className="press grid h-full w-16 place-items-center rounded-r-lg hover:bg-black/10">
                              <IconPlus className="size-6" />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 rounded-xl border-2 border-dashed border-line p-4">
          <Field label="Off-menu item" className="min-w-44 flex-1">
            <Input placeholder="Birthday cake slice" value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} />
          </Field>
          <Field label="Price" className="w-28">
            <Input type="number" inputMode="decimal" min={0} className="num" value={custom.price} onChange={(e) => setCustom((c) => ({ ...c, price: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addCustom()} />
          </Field>
          <Button onClick={addCustom} disabled={!custom.name.trim() || !(Number(custom.price) > 0)}>
            Add to bill
          </Button>
        </div>
      </section>

      {/* ---------- Till roll ---------- */}
      <div ref={tillRef} className="grid scroll-mt-20 gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1 lg:pb-2">
        <div className="till">
          <div className="till-paper rounded-t-md px-5 pt-5 pb-3">
            <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-[#1b2459]/30 pb-3">
              <p className="text-[1.3125rem] leading-none font-[720] [font-stretch:78%]">{config.cafeName}</p>
              <p className="text-[0.875rem] text-[#5b628a]">
                {orderType === "dine_in" ? (tableNo ? `Table ${tableNo}` : "Dine-in") : orderType === "takeaway" ? "Takeaway" : "Delivery"}
              </p>
            </div>

            {cart.length === 0 ? (
              <p className="py-10 text-center text-[#5b628a]">Tap items on the menu and they&apos;ll print here.</p>
            ) : (
              <ul className="divide-y divide-dashed divide-[#1b2459]/15">
                {cart.map((l) => (
                  <li key={l.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-baseline gap-1.5 font-[560]">
                        {l.diet && <DietMark diet={l.diet} className="translate-y-[1px]" />}
                        <span className="truncate">{l.name}</span>
                      </p>
                      <p className="truncate text-[0.875rem] text-[#5b628a]">
                        {l.detail && `${l.detail}, `}
                        {formatINR(l.unitPrice)} each
                      </p>
                    </div>
                    <p className="money text-right text-[1.125rem]">{formatINR(l.unitPrice * l.input.qty)}</p>
                    <div className="col-span-2 mt-1.5 flex items-center gap-1">
                      <button type="button" aria-label={`One less ${l.name}`} className="press grid size-10 place-items-center rounded-md border border-[#1b2459]/20 hover:bg-[#1b2459]/5" onClick={() => setQty(l.key, l.input.qty - 1)}>
                        <IconMinus className="size-4" />
                      </button>
                      <QtyInput qty={l.input.qty} name={l.name} onCommit={(n) => setQty(l.key, n)} />
                      <button type="button" aria-label={`One more ${l.name}`} className="press grid size-10 place-items-center rounded-md border border-[#1b2459]/20 hover:bg-[#1b2459]/5" onClick={() => setQty(l.key, l.input.qty + 1)}>
                        <IconPlus className="size-4" />
                      </button>
                      <button type="button" className="ml-auto text-[0.8125rem] text-[#5b628a] underline-offset-2 hover:text-[#b3261e] hover:underline" onClick={() => setQty(l.key, 0)}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <dl className="grid gap-1 border-t border-dashed border-[#1b2459]/30 pt-3 text-[0.9375rem] text-[#5b628a]">
              <TillRow label={`Subtotal, ${count} item${count === 1 ? "" : "s"}`} value={formatINR(totals.subtotal)} />
              {totals.discount > 0 && <TillRow label="Discount" value={`−${formatINR(totals.discount)}`} />}
              {taxed && (
                <>
                  <TillRow label={`CGST ${config.gstRate / 2}%`} value={formatINR(totals.cgst)} />
                  <TillRow label={`SGST ${config.gstRate / 2}%`} value={formatINR(totals.sgst)} />
                </>
              )}
              {totals.roundOff !== 0 && <TillRow label="Round off" value={`${totals.roundOff > 0 ? "+" : "−"}${formatINR(Math.abs(totals.roundOff))}`} />}
            </dl>
            <div className="double-rule mt-3 flex items-baseline justify-between [--rule:#1b2459]">
              <span className="text-[1.125rem] font-[650]">Total</span>
              <span className="money text-[2.25rem] leading-none" aria-live="polite">
                {formatINR(totals.total)}
              </span>
            </div>
            {taxed && config.pricesIncludeTax && <p className="mt-1 text-right text-[0.8125rem] text-[#5b628a]">Menu prices include GST</p>}
          </div>
          <div className="till-tear" aria-hidden />
        </div>

        <div className="grid gap-4">
          <Segmented<OrderType>
            label="Order type"
            className="w-full"
            value={orderType}
            onChange={setOrderType}
            options={[
              { value: "dine_in", label: "Dine-in" },
              { value: "takeaway", label: "Takeaway" },
              { value: "delivery", label: "Delivery" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Guest name">
              <Input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="Walk-in" autoComplete="off" />
            </Field>
            {orderType === "dine_in" ? (
              <Field label="Table (required)" error={tried && tableMissing ? "Enter the table number." : undefined}>
                <Input ref={tableInput} required value={tableNo} aria-invalid={tried && tableMissing} onChange={(e) => setTableNo(e.target.value)} placeholder="T4" />
              </Field>
            ) : (
              <Field label="Phone">
                <Input type="tel" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} autoComplete="off" />
              </Field>
            )}
          </div>
          {orderType === "dine_in" && (
            <Field label="Phone" hint="Needed to send the bill on WhatsApp.">
              <Input type="tel" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} autoComplete="off" />
            </Field>
          )}

          {editing ? (
            <p className={`rounded-lg px-3 py-2 ${editing.status === "due" ? "bg-bad/10 text-bad" : "bg-good/10 text-good"}`}>
              {editing.status === "due" ? "This bill is due. Mark it paid from the bill once the guest settles it." : `This bill was paid by ${editing.paidBy}. If the total changes, collect or return the difference${editing.paymentMode === "mixed" ? "; the cash part of the bill is changed to match" : ""}.`}
            </p>
          ) : (
            <div className="grid gap-1.5">
              <span className="label">Payment</span>
              <div role="radiogroup" aria-label="Payment" className="grid grid-cols-2 gap-2">
                {(["due", "paid"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={status === s}
                    onClick={() => setStatus(s)}
                    className={`press h-12 rounded-lg border-2 text-[1.0625rem] font-[650] ${
                      status === s ? (s === "due" ? "border-bad bg-bad text-bg" : "border-good bg-good text-bg") : "border-line text-ink-2 hover:border-ink-3"
                    }`}
                  >
                    {s === "due" ? "Due" : "Paid"}
                  </button>
                ))}
              </div>
              {status === "paid" && (
                <Segmented<PaymentMode>
                  label="Paid by"
                  className="mt-1 w-full"
                  value={paymentMode}
                  onChange={setPaymentMode}
                  options={[
                    { value: "upi", label: "UPI" },
                    { value: "cash", label: "Cash" },
                    { value: "card", label: "Card" },
                    { value: "mixed", label: "Mixed" },
                    { value: "other", label: "Other" },
                  ]}
                />
              )}
              {mixed && <SplitFields className="mt-1" total={totals.total} value={split} onChange={setSplit} />}
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Discount">
              <Input type="number" inputMode="decimal" min={0} className="num" value={discountValue || ""} onChange={(e) => setDiscountValue(Number(e.target.value))} placeholder="None" />
            </Field>
            <Segmented<DiscountType>
              label="Discount in"
              value={discountType}
              onChange={setDiscountType}
              options={[
                { value: "percent", label: "%" },
                { value: "flat", label: "₹" },
              ]}
            />
          </div>

          {showB2B ? (
            <div className="grid gap-3 rounded-lg bg-surface-2/60 p-3">
              <Field label="Business GSTIN" error={gstinInvalid ? "A GSTIN has 15 characters, like 29ABCDE1234F1Z5." : undefined}>
                <Input value={customer.gstin} aria-invalid={gstinInvalid} onChange={(e) => setCustomer((c) => ({ ...c, gstin: e.target.value.toUpperCase() }))} maxLength={15} className="uppercase" />
              </Field>
              <Field label="Billing address">
                <Textarea rows={2} value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} />
              </Field>
            </div>
          ) : (
            <button type="button" className="justify-self-start font-[560] text-accent underline-offset-4 hover:underline" onClick={() => setShowB2B(true)}>
              Bill a business with a GSTIN
            </button>
          )}

          <div className={editing ? "grid" : "grid grid-cols-2 gap-3"}>
            {!editing && (
              <Field label="Print as">
                <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Note on bill">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-bad">
              {error}
            </p>
          )}
          {editing ? (
            <div className="grid gap-2">
              <Button variant="primary" size="lg" className="w-full" disabled={pending || cart.length === 0 || gstinInvalid || splitOver} onClick={() => save(false)}>
                {pending ? "Saving changes…" : `Save changes, ${formatINR(totals.total)}`}
              </Button>
              <p className="text-center text-[0.875rem] text-ink-2">Added and removed items print on a kitchen slip.</p>
              <Link href={`/invoices/${editing.id}`} className={buttonClass("ghost", "md", "w-full")}>
                Cancel, keep the bill as it was
              </Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {/* The kitchen gets its slip as soon as the order is taken; the bill itself prints when the guest pays. */}
              <Button variant="primary" size="lg" className="w-full" disabled={pending || cart.length === 0 || gstinInvalid || splitOver} onClick={() => save(true)}>
                {pending ? "Saving bill…" : cart.length ? `Save and print kitchen slip, ${formatINR(totals.total)}` : "Save and print kitchen slip"}
              </Button>
              <Button variant="secondary" className="w-full" disabled={pending || cart.length === 0 || gstinInvalid || splitOver} onClick={() => save(false)}>
                Save without a kitchen slip
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Phone: the bill is below the menu, so keep its total in reach */}
      {count > 0 && (
        <button
          type="button"
          onClick={() => tillRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="press fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center justify-between rounded-lg bg-ink px-5 text-bg shadow-[0_10px_30px_-10px_rgb(18_22_43/0.6)] lg:hidden"
        >
          <span className="font-[560]">
            View bill, {count} item{count === 1 ? "" : "s"}
          </span>
          <span className="money text-[1.3125rem]">{formatINR(totals.total)}</span>
        </button>
      )}

      <dialog ref={pickDialog} onClose={() => setPicking(null)} className="sheet m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink">
        {picking && (
          <OptionPicker
            key={picking.id}
            item={picking}
            onCancel={() => pickDialog.current?.close()}
            onAdd={(variantId, addonIds, qty) => {
              addMenu(picking, variantId, addonIds, qty);
              pickDialog.current?.close();
            }}
          />
        )}
      </dialog>
    </div>
  );
}

function TillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function QtyInput({ qty, name, onCommit }: { qty: number; name: string; onCommit: (qty: number) => void }) {
  // Typing goes into a draft so clearing the field to type "12" doesn't drop the line.
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const commit = () => {
    const n = Number(draft);
    if (!cancelled.current && draft && n > 0) onCommit(n);
    cancelled.current = false;
    setDraft(null);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={`Quantity of ${name}`}
      className="num h-10 w-12 rounded-md border border-[#1b2459]/20 bg-transparent text-center text-[1.0625rem] font-[650] focus:border-[#1b2459]/60 focus:outline-none"
      value={draft ?? String(qty)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelled.current = true;
        if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
      }}
    />
  );
}

function OptionPicker({ item, onCancel, onAdd }: { item: MenuItem; onCancel: () => void; onAdd: (variantId: string | undefined, addonIds: string[], qty: number) => void }) {
  const [variantId, setVariantId] = useState<string | undefined>(item.variants[0]?.id);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const price = lineUnitPrice(item, variantId, addonIds);
  const choice = "press flex min-h-13 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 has-checked:border-accent has-checked:bg-accent-soft border-line hover:border-ink-3";
  return (
    <form
      className="grid min-w-0 gap-6 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(variantId, addonIds, qty);
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="flex items-baseline gap-2 text-[1.5rem] leading-tight font-[720] [font-stretch:78%]">
          <DietMark diet={item.diet} />
          {item.name}
        </h2>
        <Button variant="ghost" size="sm" aria-label="Close" onClick={onCancel}>
          <IconClose className="size-4" />
        </Button>
      </div>
      {item.variants.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="label mb-2">Size</legend>
          {item.variants.map((v) => (
            <label key={v.id} className={choice}>
              <input type="radio" name="variant" className="size-4 accent-[var(--accent)]" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
              <span className="flex-1 font-[540]">{v.name}</span>
              <span className="money text-[1.0625rem]">{formatINR(v.price)}</span>
            </label>
          ))}
        </fieldset>
      )}
      {item.addons.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="label mb-2">Add-ons</legend>
          {item.addons.map((a) => {
            const on = addonIds.includes(a.id);
            return (
              <label key={a.id} className={choice}>
                <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={on} onChange={() => setAddonIds((ids) => (on ? ids.filter((x) => x !== a.id) : [...ids, a.id]))} />
                <span className="flex-1 font-[540]">{a.name}</span>
                <span className="num text-ink-2">+{formatINR(a.price)}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Quantity" className="flex h-14 shrink-0 items-center rounded-lg border border-line">
          <button type="button" aria-label="One less" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="press grid h-full w-12 place-items-center disabled:text-ink-3">
            <IconMinus className="size-4" />
          </button>
          <span className="num w-8 text-center text-[1.125rem] font-[700]" aria-live="polite">
            {qty}
          </span>
          <button type="button" aria-label="One more" onClick={() => setQty((q) => Math.min(999, q + 1))} className="press grid h-full w-12 place-items-center">
            <IconPlus className="size-4" />
          </button>
        </div>
        <Button type="submit" variant="primary" size="lg" className="min-w-[11rem] flex-1 px-4" autoFocus>
          Add {qty > 1 ? `${qty} ` : ""}to bill, {formatINR(price * qty)}
        </Button>
      </div>
    </form>
  );
}
