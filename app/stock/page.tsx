import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StockList } from "./stock-list";
import { Pagination } from "./pagination";

const PAGE_SIZE = 10;

async function getStockTransactions(page: number) {
  const [transactions, totalCount] = await Promise.all([
    prisma.stockTransaction.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        part: {
          select: { code: true, name: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.stockTransaction.count(),
  ]);

  return { transactions, totalCount };
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10));
  const { transactions, totalCount } = await getStockTransactions(currentPage);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="入出庫管理" userEmail={session.user?.email} activePage="stock" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              入出庫履歴
              <span className="ml-2 text-sm font-normal text-gray-500">
                （全{totalCount}件）
              </span>
            </h2>
          </div>
          <Link href="/stock/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              入出庫登録
            </Button>
          </Link>
        </div>

        <StockList transactions={transactions} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/stock"
        />
      </main>
    </div>
  );
}
