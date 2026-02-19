import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parts = await prisma.part.findMany({
    orderBy: { code: "asc" },
    select: {
      code: true,
      name: true,
      description: true,
      price: true,
      stock: true,
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "部品管理システム";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("部品マスタ");

  // Define columns
  sheet.columns = [
    { header: "部品コード", key: "code", width: 15 },
    { header: "部品名", key: "name", width: 30 },
    { header: "説明", key: "description", width: 40 },
    { header: "価格", key: "price", width: 12 },
    { header: "在庫数", key: "stock", width: 10 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;

  // Add data rows
  for (const part of parts) {
    sheet.addRow({
      code: part.code,
      name: part.name,
      description: part.description || "",
      price: part.price,
      stock: part.stock,
    });
  }

  // Format price column as number
  sheet.getColumn("price").numFmt = "#,##0";
  sheet.getColumn("stock").numFmt = "#,##0";

  // Add borders to all cells
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: parts.length + 1, column: 5 },
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="parts_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
