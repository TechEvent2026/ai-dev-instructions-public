import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  ArrowLeftRight,
  AlertTriangle,
  TrendingUp,
  Boxes,
  DollarSign,
  Activity,
} from "lucide-react";

async function getDashboardData() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalParts,
    totalStockAgg,
    allPartsForValue,
    todayTransactions,
    lowStockParts,
    recentTransactions,
  ] = await Promise.all([
    prisma.part.count(),
    prisma.part.aggregate({ _sum: { stock: true } }),
    prisma.part.findMany({ select: { price: true, stock: true } }),
    prisma.stockTransaction.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.part.findMany({
      where: { stock: { lte: 100 } },
      orderBy: { stock: "asc" },
      take: 10,
    }),
    prisma.stockTransaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        part: { select: { code: true, name: true } },
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const totalStock = totalStockAgg._sum.stock ?? 0;
  const totalStockValue = allPartsForValue.reduce(
    (sum, p) => sum + p.price * p.stock,
    0
  );

  return {
    totalParts,
    totalStock,
    totalStockValue,
    todayTransactions,
    lowStockParts,
    recentTransactions,
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const {
    totalParts,
    totalStock,
    totalStockValue,
    todayTransactions,
    lowStockParts,
    recentTransactions,
  } = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        title="ダッシュボード"
        userEmail={session.user?.email}
        activePage="dashboard"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                登録部品数
              </CardTitle>
              <Package className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalParts}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                総在庫数
              </CardTitle>
              <Boxes className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {totalStock.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                在庫総額
              </CardTitle>
              <DollarSign className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ¥{totalStockValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                本日の入出庫
              </CardTitle>
              <Activity className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayTransactions}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Alert */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                在庫アラート（100個以下）
              </CardTitle>
              <Link href="/parts">
                <Button variant="ghost" size="sm">
                  すべて表示
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {lowStockParts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  在庫が少ない部品はありません。
                </p>
              ) : (
                <div className="space-y-2">
                  {lowStockParts.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <span className="text-xs font-mono text-gray-500 mr-2">
                          {part.code}
                        </span>
                        <span className="text-sm font-medium">{part.name}</span>
                      </div>
                      <span
                        className={`text-sm font-bold ${part.stock <= 10
                            ? "text-red-600"
                            : part.stock <= 50
                              ? "text-orange-500"
                              : "text-yellow-600"
                          }`}
                      >
                        {part.stock}個
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                最近の入出庫
              </CardTitle>
              <Link href="/stock">
                <Button variant="ghost" size="sm">
                  すべて表示
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-500">
                  入出庫履歴はありません。
                </p>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tx.type === "IN"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                            }`}
                        >
                          {tx.type === "IN" ? "入庫" : "出庫"}
                        </span>
                        <div>
                          <span className="text-sm font-medium">
                            {tx.part.name}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            ×{tx.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {tx.user.name ?? tx.user.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/parts/new">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <Package className="h-6 w-6 text-blue-500" />
                <span className="font-medium">部品を登録する</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/stock/new">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <ArrowLeftRight className="h-6 w-6 text-green-500" />
                <span className="font-medium">入出庫を登録する</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/users/new">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <Activity className="h-6 w-6 text-purple-500" />
                <span className="font-medium">ユーザーを追加する</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
