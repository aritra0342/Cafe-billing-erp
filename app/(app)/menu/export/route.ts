import { getMenu } from "@/lib/data";
import { menuWorkbook } from "@/lib/menu-sheet";

/** The whole menu as an Excel sheet, ready to edit and upload again on the Menu page. */
export async function GET() {
  const { categories, items } = await getMenu();
  const file = await menuWorkbook(categories, items);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="menu.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
