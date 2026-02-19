"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const csvRowSchema = z.object({
  code: z.string().min(1, "部品コードは必須です"),
  name: z.string().min(1, "部品名は必須です"),
  description: z.string().optional(),
  price: z.number().min(0, "価格は0以上である必要があります"),
  stock: z.number().int().min(0, "在庫は0以上の整数である必要があります"),
});

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}

export async function importParts(formData: FormData): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, created: 0, updated: 0, errors: ["認証が必要です"] };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, created: 0, updated: 0, errors: ["ファイルが選択されていません"] };
  }

  const text = await file.text();
  // Remove BOM if present
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return { success: false, created: 0, updated: 0, errors: ["データ行がありません"] };
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = i + 2; // 1-indexed, header is line 1
    const fields = parseCSVLine(dataLines[i]);

    if (fields.length < 5) {
      errors.push(`${lineNum}行目: カラム数が不足しています（${fields.length}列、5列必要）`);
      continue;
    }

    const [code, name, description, priceStr, stockStr] = fields;

    const priceNum = parseFloat(priceStr);
    const stockNum = parseInt(stockStr, 10);

    if (isNaN(priceNum)) {
      errors.push(`${lineNum}行目: 価格が数値ではありません (${priceStr})`);
      continue;
    }
    if (isNaN(stockNum)) {
      errors.push(`${lineNum}行目: 在庫数が数値ではありません (${stockStr})`);
      continue;
    }

    const parseResult = csvRowSchema.safeParse({
      code,
      name,
      description: description || undefined,
      price: priceNum,
      stock: stockNum,
    });

    if (!parseResult.success) {
      const msgs = parseResult.error.issues.map((e) => e.message).join(", ");
      errors.push(`${lineNum}行目: ${msgs}`);
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
      errors.push(`${lineNum}行目 (${code}): ${msg}`);
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
