import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { OrderForm } from "../order-form";

export default async function NewOrderPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const parts = await prisma.part.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, price: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="発注管理" userEmail={session.user?.email} activePage="orders" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderForm parts={parts} />
      </main>
    </div>
  );
}
