import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { StockForm } from "../stock-form";

async function getParts() {
  return await prisma.part.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      stock: true,
    },
  });
}

export default async function NewStockTransactionPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const parts = await getParts();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">入出庫登録</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StockForm parts={parts} />
      </main>
    </div>
  );
}
