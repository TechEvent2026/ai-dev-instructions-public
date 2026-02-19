import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { OrderForm } from "../../order-form";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        select: { partId: true, quantity: true, unitPrice: true },
      },
    },
  });

  if (!order) notFound();
  if (order.status !== "DRAFT") redirect(`/orders/${id}`);

  const parts = await prisma.part.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, price: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="発注管理" userEmail={session.user?.email} activePage="orders" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderForm parts={parts} order={order} />
      </main>
    </div>
  );
}
