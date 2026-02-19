import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

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

  const header = "部品コード,部品名,説明,価格,在庫数";
  const rows = parts.map((p) => {
    const desc = p.description
      ? `"${p.description.replace(/"/g, '""')}"`
      : "";
    const name = p.name.includes(",") || p.name.includes('"')
      ? `"${p.name.replace(/"/g, '""')}"`
      : p.name;
    return `${p.code},${name},${desc},${p.price},${p.stock}`;
  });

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="parts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
