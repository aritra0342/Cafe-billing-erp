"use client";

import { useRef, useState, useTransition } from "react";
import { createCategory, deleteCategory, deleteItem, loadSampleMenu, moveCategory, removeItemPhoto, renameCategory, saveItem, setItemAvailable, setItemPhoto, type ItemInput } from "@/lib/actions/menu";
import { formatINR, type Category, type Diet, type MenuItem, type Option } from "@/lib/billing";
import { Button, DietMark, EmptyState, Field, Input, Segmented, Select, Textarea } from "./ui";
import { IconClose, IconDown, IconEdit, IconPlus, IconTrash, IconUp } from "./icons";
import { ItemPhotoField, type PhotoChange } from "./item-photo";

const newId = () => Math.random().toString(36).slice(2, 10);
const rupees = (n: number) => formatINR(n).replace(".00", "");

function priceSummary(item: MenuItem) {
  if (!item.variants.length) return rupees(item.price);
  const prices = item.variants.map((v) => v.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? rupees(lo) : `${rupees(lo)}–${rupees(hi).replace("₹", "")}`;
}

type Result = { ok: true; id?: string } | { ok: false; error: string };

export function MenuEditor({ categories, items }: { categories: Category[]; items: MenuItem[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [newCat, setNewCat] = useState("");
  const [editing, setEditing] = useState<ItemInput | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? "" : r.error);
    });

  const openEditor = (input: ItemInput) => {
    setEditing(input);
    requestAnimationFrame(() => dialog.current?.showModal());
  };

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    run(async () => {
      const r = await createCategory(newCat);
      if (r.ok) setNewCat("");
      return r;
    });
  };

  const newCategoryForm = (
    <form onSubmit={addCategory} className="flex w-full max-w-md gap-2">
      <Input aria-label="New category name" placeholder="New category, like Sandwiches" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
      <Button type="submit" disabled={pending || !newCat.trim()}>
        Add category
      </Button>
    </form>
  );

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Your menu card is blank"
        action={
          <>
            <Button variant="primary" disabled={pending} onClick={() => run(loadSampleMenu)}>
              {pending ? "Adding the menu…" : "Add the Baithakkhana menu"}
            </Button>
            <span className="text-ink-3">or</span>
            {newCategoryForm}
          </>
        }
      >
        Adds all 45 items in 8 sections (tea and coffee, breads and burgers, drinks, snacks, pasta and wraps, noodles, momo and pizza) with their prices. You can change anything afterwards.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-12">
      {error && (
        <p role="alert" className="rounded-lg bg-bad/10 px-4 py-2.5 text-bad">
          {error}
        </p>
      )}

      {items.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-line p-5">
          <p className="max-w-prose text-ink-2">No items yet. Add the Baithakkhana menu to fill these sections with all 45 items and their prices.</p>
          <Button variant="primary" disabled={pending} onClick={() => run(loadSampleMenu)}>
            {pending ? "Adding the menu…" : "Add the Baithakkhana menu"}
          </Button>
        </div>
      )}

      {categories.map((cat, ci) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        return (
          <section key={cat.id} aria-label={cat.name}>
            <CategoryHeader
              category={cat}
              count={catItems.length}
              first={ci === 0}
              last={ci === categories.length - 1}
              pending={pending}
              onRename={(name) => run(() => renameCategory(cat.id, name))}
              onMove={(d) => run(() => moveCategory(cat.id, d))}
              onDelete={() => {
                if (confirm(`Delete ${cat.name} and its ${catItems.length} item${catItems.length === 1 ? "" : "s"}? Bills already issued keep their lines.`)) run(() => deleteCategory(cat.id));
              }}
            />
            {catItems.length > 0 && (
              <ul>
                {catItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 border-b border-line py-3">
                    {item.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/menu/photo/${item.photo}`} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-md bg-surface-2 object-cover" />
                    ) : null}
                    <DietMark diet={item.diet} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <button type="button" onClick={() => openEditor({ ...item })} className={`truncate text-left text-[1.0625rem] font-[560] hover:text-accent ${item.available ? "" : "text-ink-3 line-through decoration-bad/70"}`}>
                          {item.name}
                        </button>
                        <span className="leader hidden sm:block" aria-hidden />
                        <span className="money hidden shrink-0 text-[1.125rem] sm:inline">{priceSummary(item)}</span>
                      </div>
                      <p className="truncate text-[0.875rem] text-ink-2">
                        <span className="money mr-2 text-ink sm:hidden">{priceSummary(item)}</span>
                        {item.variants.length > 0 && <span className="mr-3">{item.variants.map((v) => v.name).join(", ")}</span>}
                        {item.addons.length > 0 && (
                          <span>
                            {item.addons.length} add-on{item.addons.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                    </div>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[0.875rem] text-ink-2">
                      <input type="checkbox" role="switch" className="peer sr-only" checked={item.available} onChange={(e) => run(() => setItemAvailable(item.id, e.target.checked))} />
                      <span
                        aria-hidden
                        className="relative h-6 w-10 rounded-full bg-surface-2 ring-1 ring-line transition-colors peer-checked:bg-good peer-focus-visible:ring-4 peer-focus-visible:ring-accent/25 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
                      />
                      <span className="hidden w-16 sm:inline">{item.available ? "In stock" : "Sold out"}</span>
                    </label>
                    <Button variant="ghost" size="sm" aria-label={`Edit ${item.name}`} onClick={() => openEditor({ ...item })}>
                      <IconEdit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => {
                        if (confirm(`Delete ${item.name} from the menu?`)) run(() => deleteItem(item.id));
                      }}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => openEditor({ categoryId: cat.id, name: "", description: "", price: 0, diet: "veg", available: true, variants: [], addons: [] })}
              className="press mt-2 flex h-11 items-center gap-2 rounded-md px-2 font-[560] text-accent hover:bg-accent-soft"
            >
              <IconPlus className="size-4" /> Add an item to {cat.name}
            </button>
          </section>
        );
      })}

      <div className="rounded-xl border-2 border-dashed border-line p-5">{newCategoryForm}</div>

      <dialog ref={dialog} onClose={() => setEditing(null)} className="sheet m-auto max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink">
        {editing && <ItemForm key={editing.id ?? "new"} initial={editing} categories={categories} onCancel={() => dialog.current?.close()} onSaved={() => dialog.current?.close()} />}
      </dialog>
    </div>
  );
}

function CategoryHeader({
  category,
  count,
  first,
  last,
  pending,
  onRename,
  onMove,
  onDelete,
}: {
  category: Category;
  count: number;
  first: boolean;
  last: boolean;
  pending: boolean;
  onRename: (name: string) => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2 border-b-2 border-rule pb-2">
      {renaming ? (
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && name !== category.name) onRename(name);
            setRenaming(false);
          }}
        >
          <Input autoFocus aria-label="Category name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" onKeyDown={(e) => e.key === "Escape" && setRenaming(false)} />
          <Button type="submit" variant="primary">
            Save name
          </Button>
        </form>
      ) : (
        <h2 className="flex flex-1 items-baseline gap-3">
          <button type="button" className="text-left text-[1.75rem] leading-tight font-[720] [font-stretch:78%] hover:text-accent" onClick={() => setRenaming(true)} title="Rename">
            {category.name}
          </button>
          <span className="text-[0.875rem] font-normal text-ink-3">
            {count} item{count === 1 ? "" : "s"}
          </span>
        </h2>
      )}
      <div className="flex items-center">
        <Button variant="ghost" size="sm" aria-label={`Move ${category.name} up`} disabled={first || pending} onClick={() => onMove(-1)}>
          <IconUp className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" aria-label={`Move ${category.name} down`} disabled={last || pending} onClick={() => onMove(1)}>
          <IconDown className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" aria-label={`Delete ${category.name}`} onClick={onDelete}>
          <IconTrash className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function OptionsEditor({ label, hint, options, onChange, namePlaceholder, addLabel }: { label: string; hint: string; options: Option[]; onChange: (o: Option[]) => void; namePlaceholder: string; addLabel: string }) {
  const update = (i: number, patch: Partial<Option>) => onChange(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  return (
    <fieldset className="grid gap-2">
      <legend className="label mb-1">{label}</legend>
      <p className="-mt-1 mb-1 text-[0.875rem] text-ink-3">{hint}</p>
      {options.map((o, i) => (
        <div key={o.id} className="flex gap-2">
          <Input aria-label={`${label}: name`} placeholder={namePlaceholder} value={o.name} onChange={(e) => update(i, { name: e.target.value })} />
          <div className="relative w-32 shrink-0">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">₹</span>
            <Input aria-label={`${label}: price`} type="number" inputMode="decimal" min={0} step="0.5" className="num pl-7" value={o.price || ""} onChange={(e) => update(i, { price: Number(e.target.value) })} />
          </div>
          <Button variant="ghost" aria-label={`Remove ${o.name || "row"}`} onClick={() => onChange(options.filter((_, j) => j !== i))}>
            <IconClose className="size-4" />
          </Button>
        </div>
      ))}
      <button type="button" className="press justify-self-start rounded-md px-2 py-1.5 font-[560] text-accent hover:bg-accent-soft" onClick={() => onChange([...options, { id: newId(), name: "", price: 0 }])}>
        + {addLabel}
      </button>
    </fieldset>
  );
}

function ItemForm({ initial, categories, onCancel, onSaved }: { initial: ItemInput; categories: Category[]; onCancel: () => void; onSaved: () => void }) {
  const [v, setV] = useState<ItemInput>(initial);
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof ItemInput>(k: K, val: ItemInput[K]) => setV((s) => ({ ...s, [k]: val }));

  return (
    <form
      className="grid gap-6 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveItem(v);
          if (!r.ok) return setError(r.error);
          // The photo is saved after the item, so a new item has an id to attach it to.
          if (photo.kind !== "keep" && r.id) {
            const form = new FormData();
            if (photo.kind === "new") form.set("photo", photo.blob, "photo");
            const p = await (photo.kind === "new" ? setItemPhoto(r.id, form) : removeItemPhoto(r.id)).catch(() => ({ ok: false as const, error: "Check your connection." }));
            if (!p.ok) {
              setV((s) => ({ ...s, id: r.id }));
              return setError(`The item is saved, but its photo isn't. ${p.error}`);
            }
          }
          onSaved();
        });
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[1.5rem] leading-tight font-[720] [font-stretch:78%]">{initial.id ? `Edit ${initial.name}` : "New menu item"}</h2>
        <Button variant="ghost" size="sm" aria-label="Close" onClick={onCancel}>
          <IconClose className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="Name">
          <Input autoFocus required value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Cappuccino" />
        </Field>
        <Field label="Section">
          <Select value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <ItemPhotoField current={initial.photo ?? ""} name={v.name} onChange={setPhoto} />
      <Field label="Description" hint="For your own reference. It doesn't print on bills.">
        <Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} />
      </Field>

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <span className="label">Food mark</span>
          <Segmented<Diet>
            label="Food mark"
            value={v.diet}
            onChange={(d) => set("diet", d)}
            options={[
              { value: "veg", label: "Veg" },
              { value: "egg", label: "Egg" },
              { value: "nonveg", label: "Non-veg" },
            ]}
          />
        </div>
        {v.variants.length === 0 && (
          <Field label="Price" className="w-36">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">₹</span>
              <Input type="number" inputMode="decimal" min={0} step="0.5" className="num pl-7" value={v.price || ""} onChange={(e) => set("price", Number(e.target.value))} />
            </div>
          </Field>
        )}
        <label className="flex h-11 items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={v.available} onChange={(e) => set("available", e.target.checked)} />
          In stock
        </label>
      </div>

      <OptionsEditor
        label="Sizes"
        hint="Each size has its own price, which replaces the single price above. Skip this if the item comes in one size."
        namePlaceholder="Regular, Large, Kulhad"
        addLabel="Add a size"
        options={v.variants}
        onChange={(o) => set("variants", o)}
      />
      <OptionsEditor label="Add-ons" hint="Extras charged on top, like an extra shot or oat milk." namePlaceholder="Extra shot" addLabel="Add an add-on" options={v.addons} onChange={(o) => set("addons", o)} />

      {error && (
        <p role="alert" className="text-bad">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : initial.id ? "Save changes" : "Add to menu"}
        </Button>
      </div>
    </form>
  );
}
