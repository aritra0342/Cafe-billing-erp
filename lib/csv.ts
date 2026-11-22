/** RFC 4180 CSV. Text cells that a spreadsheet would run as a formula are prefixed with an apostrophe. */
export function toCsv(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    if (typeof v === "number") return String(v);
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  // The BOM makes Excel read the file as UTF-8, so names in Indian scripts and "₹" survive.
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
