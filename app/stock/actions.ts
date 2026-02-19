"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const stockTransactionSchema = z.object({
  partId: z.string().min(1, "部品を選択してください"),
  type: z.enum(["IN", "OUT"], {
    errorMap: () => ({ message: "入庫または出庫を選択してください" }),
  }),
  quantity: z.number().int().min(1, "数量は1以上である必要があります"),
  note: z.string().optional(),
});

export async function createStockTransaction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const data = {
    partId: formData.get("partId") as string,
    type: formData.get("type") as string,
    quantity: parseInt(formData.get("quantity") as string, 10),
    note: (formData.get("note") as string) || undefined,
  };

  const validated = stockTransactionSchema.parse(data);

  await prisma.$transaction(async (tx) => {
    const part = await tx.part.findUnique({
      where: { id: validated.partId },
    });

    if (!part) {
      throw new Error("指定された部品が見つかりません");
    }

    if (validated.type === "OUT" && part.stock < validated.quantity) {
      throw new Error(
        `在庫不足です。現在の在庫: ${part.stock}、出庫数量: ${validated.quantity}`
      );
    }

    await tx.stockTransaction.create({
      data: {
        partId: validated.partId,
        userId: session.user!.id!,
        type: validated.type,
        quantity: validated.quantity,
        note: validated.note || null,
      },
    });

    await tx.part.update({
      where: { id: validated.partId },
      data: {
        stock:
          validated.type === "IN"
            ? { increment: validated.quantity }
            : { decrement: validated.quantity },
      },
    });
  });

  revalidatePath("/stock");
  revalidatePath("/parts");
  redirect("/stock");
}
