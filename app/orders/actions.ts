"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canApproveOrders } from "@/lib/roles";

// --- Schemas ---

const orderItemSchema = z.object({
  partId: z.string().min(1, "部品を選択してください"),
  quantity: z.number().int().min(1, "数量は1以上である必要があります"),
  unitPrice: z.number().min(0, "単価は0以上である必要があります"),
});

const createOrderSchema = z.object({
  note: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "明細を1行以上追加してください"),
});

// --- Helpers ---

async function generateOrderNumber(): Promise<string> {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  if (!lastOrder) return "ORD-001";

  const num = parseInt(lastOrder.orderNumber.replace("ORD-", ""), 10);
  return `ORD-${String(num + 1).padStart(3, "0")}`;
}

function revalidateAll() {
  revalidatePath("/orders");
  revalidatePath("/");
}

// --- Actions ---

export async function createOrder(data: {
  note?: string;
  items: { partId: string; quantity: number; unitPrice: number }[];
  submit?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const validated = createOrderSchema.parse(data);

  const items = validated.items.map((item) => ({
    ...item,
    subtotal: item.quantity * item.unitPrice,
  }));
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      status: data.submit ? "PENDING" : "DRAFT",
      note: validated.note || null,
      totalAmount,
      requestedById: session.user.id,
      items: {
        create: items,
      },
    },
  });

  revalidateAll();
  redirect(`/orders/${order.id}`);
}

export async function updateOrder(
  orderId: string,
  data: {
    note?: string;
    items: { partId: string; quantity: number; unitPrice: number }[];
    submit?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("発注が見つかりません");
  if (order.status !== "DRAFT") throw new Error("下書き状態の発注のみ編集できます");
  if (order.requestedById !== session.user.id) throw new Error("自分の発注のみ編集できます");

  const validated = createOrderSchema.parse(data);

  const items = validated.items.map((item) => ({
    ...item,
    subtotal: item.quantity * item.unitPrice,
  }));
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId } });
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: data.submit ? "PENDING" : "DRAFT",
        note: validated.note || null,
        totalAmount,
        items: {
          create: items,
        },
      },
    });
  });

  revalidateAll();
  redirect(`/orders/${orderId}`);
}

export async function submitOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("認証が必要です");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("発注が見つかりません");
  if (order.status !== "DRAFT") throw new Error("下書き状態の発注のみ申請できます");
  if (order.requestedById !== session.user.id) throw new Error("自分の発注のみ申請できます");

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PENDING" },
  });

  revalidateAll();
  redirect(`/orders/${orderId}`);
}

export async function approveOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("認証が必要です");
  if (!canApproveOrders(session.user.role ?? "user")) {
    throw new Error("承認権限がありません");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("発注が見つかりません");
  if (order.status !== "PENDING") throw new Error("承認待ちの発注のみ承認できます");

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "APPROVED",
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  });

  revalidateAll();
  redirect(`/orders/${orderId}`);
}

export async function rejectOrder(orderId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("認証が必要です");
  if (!canApproveOrders(session.user.role ?? "user")) {
    throw new Error("承認権限がありません");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("発注が見つかりません");
  if (order.status !== "PENDING") throw new Error("承認待ちの発注のみ却下できます");

  if (!reason.trim()) throw new Error("却下理由を入力してください");

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "REJECTED",
      approvedById: session.user.id,
      approvedAt: new Date(),
      rejectionReason: reason,
    },
  });

  revalidateAll();
  redirect(`/orders/${orderId}`);
}

export async function markOrdered(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("認証が必要です");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("発注が見つかりません");
  if (order.status !== "APPROVED") throw new Error("承認済みの発注のみ発注済みにできます");

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "ORDERED",
      orderedAt: new Date(),
    },
  });

  revalidateAll();
  redirect(`/orders/${orderId}`);
}

export async function receiveOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("認証が必要です");

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new Error("発注が見つかりません");
    if (order.status !== "ORDERED") throw new Error("発注済みの発注のみ納品処理できます");

    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
      },
    });

    // Create stock transactions and update part stock for each item
    for (const item of order.items) {
      await tx.stockTransaction.create({
        data: {
          partId: item.partId,
          userId: session.user!.id!,
          type: "IN",
          quantity: item.quantity,
          note: `発注 ${order.orderNumber} による入庫`,
        },
      });

      await tx.part.update({
        where: { id: item.partId },
        data: {
          stock: { increment: item.quantity },
        },
      });
    }
  });

  revalidatePath("/orders");
  revalidatePath("/stock");
  revalidatePath("/parts");
  revalidatePath("/inventory");
  revalidatePath("/");
  redirect(`/orders/${orderId}`);
}

export async function deleteOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("認証が必要です");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("発注が見つかりません");
  if (order.status !== "DRAFT") throw new Error("下書き状態の発注のみ削除できます");
  if (order.requestedById !== session.user.id) throw new Error("自分の発注のみ削除できます");

  await prisma.order.delete({ where: { id: orderId } });

  revalidateAll();
  redirect("/orders");
}
