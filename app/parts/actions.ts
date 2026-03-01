"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

const partSchema = z.object({
  partNumber: z.string().min(1, "部品番号は必須です"),
  name: z.string().min(1, "部品名は必須です"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  quantity: z.coerce.number().int().min(0, "数量は0以上で入力してください"),
  price: z.coerce.number().min(0, "単価は0以上で入力してください"),
});

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");
  return session;
}

export async function getParts() {
  await requireAuth();
  return prisma.part.findMany({
    include: { category: true },
    orderBy: { partNumber: "asc" },
  });
}

export async function getCategories() {
  await requireAuth();
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createPart(formData: FormData) {
  await requireAuth();

  const raw = {
    partNumber: formData.get("partNumber") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    categoryId: (formData.get("categoryId") as string) || undefined,
    quantity: formData.get("quantity") as string,
    price: formData.get("price") as string,
  };

  const parsed = partSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const existing = await prisma.part.findUnique({
    where: { partNumber: parsed.data.partNumber },
  });
  if (existing) {
    return { error: "この部品番号は既に登録されています。" };
  }

  await prisma.part.create({ data: parsed.data });
  revalidatePath("/parts");
  return { success: true };
}

export async function updatePart(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    partNumber: formData.get("partNumber") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    categoryId: (formData.get("categoryId") as string) || undefined,
    quantity: formData.get("quantity") as string,
    price: formData.get("price") as string,
  };

  const parsed = partSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const existing = await prisma.part.findFirst({
    where: { partNumber: parsed.data.partNumber, NOT: { id } },
  });
  if (existing) {
    return { error: "この部品番号は既に他の部品に使用されています。" };
  }

  await prisma.part.update({ where: { id }, data: parsed.data });
  revalidatePath("/parts");
  return { success: true };
}

export async function deletePart(id: string) {
  await requireAuth();
  await prisma.part.delete({ where: { id } });
  revalidatePath("/parts");
  return { success: true };
}
