// Source of truth for the Appwrite TablesDB schema.
// Run `bun run db:build` to regenerate appwrite.config.json, then `bun run db:push` to migrate.
import { writeFileSync } from "node:fs";

const DB = "cafe";
const vc = (key, size, required = false) => ({ key, type: "varchar", size, required, array: false });
const txt = (key) => ({ key, type: "text", required: false, array: false });
const mtxt = (key) => ({ key, type: "mediumtext", required: false, array: false });
const int = (key, opts = {}) => ({ key, type: "integer", required: false, array: false, ...opts });
const dbl = (key, opts = {}) => ({ key, type: "double", required: false, array: false, ...opts });
const bool = (key, def) => ({ key, type: "boolean", required: false, array: false, default: def });
const dt = (key, required = false) => ({ key, type: "datetime", required, array: false });
const en = (key, elements, def) => ({ key, type: "string", format: "enum", elements, required: false, array: false, default: def });
const idx = (key, columns, type = "key", orders) => ({ key, type, columns, orders: orders ?? columns.map(() => "ASC") });

const owner = vc("ownerId", 36, true); // Clerk user id
const table = (id, name, columns, indexes = []) => ({
  $id: id,
  $permissions: [], // no client access: only the server (API key) reads and writes, scoped by ownerId (Clerk user id)
  databaseId: DB,
  name,
  enabled: true,
  rowSecurity: false,
  columns,
  indexes,
});

const TAX_MODES = ["regular", "composition", "unregistered"];

const config = {
  projectId: "6aec6367002417f66538",
  endpoint: "https://sgp.cloud.appwrite.io/v1",
  tablesDB: [{ $id: DB, name: "Cafe Billing", enabled: true }],
  tables: [
    table("settings", "Settings", [
      owner,
      vc("cafeName", 128, true),
      vc("legalName", 128),
      vc("address", 512),
      vc("city", 64),
      vc("pincode", 10),
      vc("stateCode", 2),
      vc("phone", 20),
      vc("email", 128),
      vc("gstin", 15),
      vc("fssai", 14),
      en("taxMode", TAX_MODES, "regular"),
      dbl("gstRate", { min: 0, max: 28, default: 5 }),
      bool("pricesIncludeTax", false),
      vc("invoicePrefix", 12),
      vc("upiId", 64),
      vc("footerNote", 512),
      vc("defaultTemplate", 32),
      vc("accentColor", 9),
      mtxt("logo"), // data URL of the logo printed on bills, resized in the browser before upload
    ]),
    table("categories", "Menu categories", [owner, vc("name", 64, true), int("sortOrder", { default: 0 })], [
      idx("by_owner", ["ownerId", "sortOrder"]),
    ]),
    table(
      "items",
      "Menu items",
      [
        owner,
        vc("categoryId", 36, true),
        vc("name", 128, true),
        vc("description", 512),
        dbl("price", { min: 0, default: 0 }),
        en("diet", ["veg", "nonveg", "egg"], "veg"),
        bool("available", true),
        txt("variants"), // JSON: [{ id, name, price }]  — sizes; replaces base price
        txt("addons"), // JSON: [{ id, name, price }]   — extras; added on top
        int("sortOrder", { default: 0 }),
        vc("photo", 36), // file id in the item-photos bucket, served through /menu/photo/[id]
      ],
      [idx("by_owner", ["ownerId", "categoryId"])],
    ),
    table(
      "invoices",
      "Invoices",
      [
        owner,
        vc("number", 32, true),
        vc("fy", 7, true),
        int("seq", { required: true, min: 1 }),
        dt("issuedAt", true),
        vc("customerName", 128),
        vc("customerPhone", 20),
        vc("customerGstin", 15),
        vc("customerAddress", 512),
        en("orderType", ["dine_in", "takeaway", "delivery"], "dine_in"),
        vc("tableNo", 16),
        en("paymentMode", ["cash", "upi", "card", "other"], "cash"),
        vc("templateId", 32),
        txt("lines"), // JSON snapshot of billed lines
        en("discountType", ["percent", "flat"], "flat"),
        dbl("discountValue", { min: 0, default: 0 }),
        dbl("subtotal", { default: 0 }),
        dbl("discount", { default: 0 }),
        dbl("taxable", { default: 0 }),
        dbl("cgst", { default: 0 }),
        dbl("sgst", { default: 0 }),
        dbl("roundOff", { default: 0 }),
        dbl("total", { default: 0 }),
        en("taxMode", TAX_MODES, "regular"),
        dbl("gstRate", { min: 0, max: 28, default: 5 }),
        txt("business"), // JSON snapshot of cafe details at billing time
        vc("notes", 512),
        // No default: bills made before payment tracking have no status and count as paid.
        { key: "status", type: "string", format: "enum", elements: ["due", "paid"], required: false, array: false },
        dt("paidAt"),
        { key: "pricesIncludeTax", type: "boolean", required: false, array: false }, // so an edit recomputes tax the way the bill was issued
      ],
      [
        idx("uniq_number", ["ownerId", "fy", "seq"], "unique"),
        idx("by_date", ["ownerId", "issuedAt"], "key", ["ASC", "DESC"]),
      ],
    ),
    // Append-only history of changes to a saved bill. Rows are only ever created, never updated,
    // so concurrent changes can't overwrite each other's record.
    table(
      "invoice_events",
      "Invoice history",
      [
        owner,
        vc("invoiceId", 36, true),
        en("type", ["layout", "items", "status"], "layout"),
        vc("from", 32),
        vc("to", 32),
        dt("at", true),
        txt("detail"), // JSON: what an item edit added and removed, for the history and the kitchen

      ],
      [idx("by_invoice", ["ownerId", "invoiceId", "at"])],
    ),
  ],
  buckets: [
    {
      $id: "item-photos",
      $permissions: [], // server only, like the tables; photos are served through an owner-checked route
      fileSecurity: false,
      name: "Menu item photos",
      enabled: true,
      maximumFileSize: 1_000_000, // photos are cropped and compressed in the browser to well under this
      allowedFileExtensions: ["webp", "jpg", "jpeg", "png"],
      compression: "none",
      encryption: true,
      antivirus: true,
    },
  ],
};

writeFileSync(new URL("../appwrite.config.json", import.meta.url), JSON.stringify(config, null, 2) + "\n");
console.log("wrote appwrite.config.json");
