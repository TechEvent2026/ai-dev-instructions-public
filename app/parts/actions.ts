"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { redirect } from "next/navigation";

const partSchema = z.object({
  code: z.string().min(1, "部品コードは必須です"),
  name: z.string().min(1, "部品名は必須です"),
  description: z.string().optional(),
  price: z.number().min(0, "価格は0以上である必要があります"),
  stock: z.number().int().min(0, "在庫は0以上の整数である必要があります"),
});

export async function createPart(formData: FormData) {
  const data = {
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    description: formData.get("description") as string || null,
    price: parseFloat(formData.get("price") as string),
    stock: parseInt(formData.get("stock") as string, 10),
  };

  const validated = partSchema.parse(data);

  await prisma.part.create({
    data: {
      code: validated.code,
      name: validated.name,
      description: validated.description || null,
      price: validated.price,
      stock: validated.stock,
    },
  });

  revalidatePath("/parts");
  redirect("/parts");
}

export async function updatePart(id: string, formData: FormData) {
  const data = {
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    description: formData.get("description") as string || null,
    price: parseFloat(formData.get("price") as string),
    stock: parseInt(formData.get("stock") as string, 10),
  };

  const validated = partSchema.parse(data);

  await prisma.part.update({
    where: { id },
    data: {
      code: validated.code,
      name: validated.name,
      description: validated.description || null,
      price: validated.price,
      stock: validated.stock,
    },
  });

  revalidatePath("/parts");
  redirect("/parts");
}

export async function deletePart(id: string) {
  await prisma.part.delete({
    where: { id },
  });

  revalidatePath("/parts");
}
