"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import ExcelJS from "exceljs";

const rowSchema = z.object({
  code: z.string().min(1, "部品コードは必須です"),
  name: z.string().min(1, "部品名は必須です"),
  description: z.string().optional(),
  price: z.number().min(0, "価格は0以上である必要があります"),
  stock: z.number().int().min(0, "在庫は0以上の整数である必要があります"),
});

export interface ExcelImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}

export async function importPartsExcel(
  formData: FormData
): Promise<ExcelImportResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: ["認証が必要です"],
    };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: ["ファイルが選択されていません"],
    };
  }

  const arrayBuffer = await file.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(arrayBuffer as ArrayBuffer);
  } catch {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: ["Excelファイルの読み込みに失敗しました。正しいxlsxファイルか確認してください。"],
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: ["ワークシートが見つかりません"],
    };
  }

  const rowCount = sheet.rowCount;
  if (rowCount < 2) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: ["データ行がありません（ヘッダー行のみ）"],
    };
  }

  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  // Detect column mapping from header row
  const headerRow = sheet.getRow(1);
  const columnMap: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value ?? "").trim();
    if (val === "部品コード") columnMap.code = colNumber;
    else if (val === "部品名") columnMap.name = colNumber;
    else if (val === "説明") columnMap.description = colNumber;
    else if (val === "価格") columnMap.price = colNumber;
    else if (val === "在庫数") columnMap.stock = colNumber;
  });

  // Fallback: assume columns 1-5 in order
  if (!columnMap.code) columnMap.code = 1;
  if (!columnMap.name) columnMap.name = 2;
  if (!columnMap.description) columnMap.description = 3;
  if (!columnMap.price) columnMap.price = 4;
  if (!columnMap.stock) columnMap.stock = 5;

  for (let rowNum = 2; rowNum <= rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);

    // Skip completely empty rows
    const codeRaw = row.getCell(columnMap.code).value;
    if (codeRaw === null || codeRaw === undefined || String(codeRaw).trim() === "") {
      continue;
    }

    const code = String(codeRaw).trim();
    const name = String(row.getCell(columnMap.name).value ?? "").trim();
    const description = String(
      row.getCell(columnMap.description).value ?? ""
    ).trim();

    const priceCell = row.getCell(columnMap.price).value;
    const stockCell = row.getCell(columnMap.stock).value;

    const priceNum = typeof priceCell === "number" ? priceCell : parseFloat(String(priceCell ?? ""));
    const stockNum = typeof stockCell === "number" ? stockCell : parseInt(String(stockCell ?? ""), 10);

    if (isNaN(priceNum)) {
      errors.push(`${rowNum}行目: 価格が数値ではありません (${String(priceCell)})`);
      continue;
    }
    if (isNaN(stockNum)) {
      errors.push(`${rowNum}行目: 在庫数が数値ではありません (${String(stockCell)})`);
      continue;
    }

    const parseResult = rowSchema.safeParse({
      code,
      name,
      description: description || undefined,
      price: priceNum,
      stock: stockNum,
    });

    if (!parseResult.success) {
      const msgs = parseResult.error.issues.map((e) => e.message).join(", ");
      errors.push(`${rowNum}行目: ${msgs}`);
      continue;
    }

    try {
      const existing = await prisma.part.findUnique({
        where: { code: parseResult.data.code },
      });

      if (existing) {
        await prisma.part.update({
          where: { code: parseResult.data.code },
          data: {
            name: parseResult.data.name,
            description: parseResult.data.description || null,
            price: parseResult.data.price,
            stock: parseResult.data.stock,
          },
        });
        updated++;
      } else {
        await prisma.part.create({
          data: {
            code: parseResult.data.code,
            name: parseResult.data.name,
            description: parseResult.data.description || null,
            price: parseResult.data.price,
            stock: parseResult.data.stock,
          },
        });
        created++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー";
      errors.push(`${rowNum}行目 (${code}): ${msg}`);
    }
  }

  revalidatePath("/parts");
  revalidatePath("/inventory");
  revalidatePath("/");

  return {
    success: errors.length === 0,
    created,
    updated,
    errors,
  };
}
