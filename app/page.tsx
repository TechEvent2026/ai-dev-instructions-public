import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { StockTrendChart, type StockChartDailyData } from "@/components/stock-trend-chart";
import {
  PartStockChart,
  type PartOption,
  type PartStockTrendMap,
} from "@/components/part-stock-chart";
import { PeriodSelector } from "@/components/period-selector";
import { periodTitle, periodGranularityLabel, type Period } from "@/lib/period";
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
  BarChart3,
  ShoppingCart,
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
    pendingOrdersCount,
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
    prisma.order.count({ where: { status: "PENDING" } }),
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
    pendingOrdersCount,
  };
}

/** 期間に応じた日数を返す */
function periodToDays(period: Period): number {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    default: return 30;
  }
}

/** 年間ビュー用: 日付からその週の月曜日を返す */
function getWeekMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 月曜始まり
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function getStockTrendData(period: Period): Promise<StockChartDailyData[]> {
  const days = periodToDays(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid startDate computed for period: ${period}`);
  }

  const transactions = await prisma.stockTransaction.findMany({
    where: { createdAt: { gte: startDate } },
    orderBy: { createdAt: "asc" },
    select: { type: true, quantity: true, createdAt: true },
  });

  // Current total stock
  const currentStockAgg = await prisma.part.aggregate({ _sum: { stock: true } });
  const currentTotal = currentStockAgg._sum.stock ?? 0;

  if (period === "1y") {
    // --- 週単位集計 ---
    const weekMap = new Map<string, { inQty: number; outQty: number; adjustQty: number; netChange: number }>();
    const weekKeys: string[] = [];

    // 初期化: startDate の週の月曜から今日の週の月曜まで
    const firstMonday = getWeekMonday(startDate);
    const lastMonday = getWeekMonday(new Date());
    const cur = new Date(firstMonday);
    while (cur <= lastMonday) {
      const key = formatDateKey(cur);
      weekMap.set(key, { inQty: 0, outQty: 0, adjustQty: 0, netChange: 0 });
      weekKeys.push(key);
      cur.setDate(cur.getDate() + 7);
    }

    // 集計
    for (const tx of transactions) {
      const monday = getWeekMonday(new Date(tx.createdAt));
      const key = formatDateKey(monday);
      const week = weekMap.get(key);
      if (!week) continue;

      if (tx.type === "IN") {
        week.inQty += tx.quantity;
        week.netChange += tx.quantity;
      } else if (tx.type === "OUT") {
        week.outQty += tx.quantity;
        week.netChange -= tx.quantity;
      } else if (tx.type === "ADJUST") {
        week.adjustQty += tx.quantity;
      }
    }

    const entries = weekKeys.map((key) => [key, weekMap.get(key)!] as const);
    const totalNetChange = entries.reduce((sum, [, v]) => sum + v.netChange, 0);
    let runningTotal = currentTotal - totalNetChange;

    return entries.map(([date, week]) => {
      runningTotal += week.netChange;
      return {
        date: `${date}~`,
        inQty: week.inQty,
        outQty: week.outQty,
        adjustQty: week.adjustQty,
        totalStock: runningTotal,
      };
    });
  }

  // --- 日単位集計 (7d / 30d / 90d) ---
  const dailyMap = new Map<string, { inQty: number; outQty: number; adjustQty: number; netChange: number }>();

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = formatDateKey(d);
    dailyMap.set(key, { inQty: 0, outQty: 0, adjustQty: 0, netChange: 0 });
  }

  for (const tx of transactions) {
    const d = new Date(tx.createdAt);
    const key = formatDateKey(d);
    const day = dailyMap.get(key);
    if (!day) continue;

    if (tx.type === "IN") {
      day.inQty += tx.quantity;
      day.netChange += tx.quantity;
    } else if (tx.type === "OUT") {
      day.outQty += tx.quantity;
      day.netChange -= tx.quantity;
    } else if (tx.type === "ADJUST") {
      day.adjustQty += tx.quantity;
    }
  }

  const entries = Array.from(dailyMap.entries());
  const totalNetChange = entries.reduce((sum, [, v]) => sum + v.netChange, 0);
  let runningTotal = currentTotal - totalNetChange;

  return entries.map(([date, day]) => {
    runningTotal += day.netChange;
    return {
      date,
      inQty: day.inQty,
      outQty: day.outQty,
      adjustQty: day.adjustQty,
      totalStock: runningTotal,
    };
  });
}

async function getPartStockTrendData(period: Period): Promise<{
  parts: PartOption[];
  trendMap: PartStockTrendMap;
}> {
  const days = periodToDays(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid startDate computed for period: ${period}`);
  }

  const partsWithTx = await prisma.part.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      stock: true,
      stockTransactions: {
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: "asc" },
        select: { type: true, quantity: true, createdAt: true },
      },
    },
    orderBy: { code: "asc" },
    take: 20,
  });

  const parts: PartOption[] = partsWithTx.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    currentStock: p.stock,
  }));

  const trendMap: PartStockTrendMap = {};

  for (const part of partsWithTx) {
    if (period === "1y") {
      // --- 週単位集計 ---
      const weekMap = new Map<
        string,
        { inQty: number; outQty: number; adjustQty: number; netChange: number }
      >();
      const weekKeys: string[] = [];

      const firstMonday = getWeekMonday(startDate);
      const lastMonday = getWeekMonday(new Date());
      const cur = new Date(firstMonday);
      while (cur <= lastMonday) {
        const key = formatDateKey(cur);
        weekMap.set(key, { inQty: 0, outQty: 0, adjustQty: 0, netChange: 0 });
        weekKeys.push(key);
        cur.setDate(cur.getDate() + 7);
      }

      for (const tx of part.stockTransactions) {
        const monday = getWeekMonday(new Date(tx.createdAt));
        const key = formatDateKey(monday);
        const week = weekMap.get(key);
        if (!week) continue;

        if (tx.type === "IN") {
          week.inQty += tx.quantity;
          week.netChange += tx.quantity;
        } else if (tx.type === "OUT") {
          week.outQty += tx.quantity;
          week.netChange -= tx.quantity;
        } else if (tx.type === "ADJUST") {
          week.adjustQty += tx.quantity;
        }
      }

      const entries = weekKeys.map((key) => [key, weekMap.get(key)!] as const);
      const totalNetChange = entries.reduce((sum, [, v]) => sum + v.netChange, 0);
      let runningStock = part.stock - totalNetChange;

      trendMap[part.id] = entries.map(([date, week]) => {
        runningStock += week.netChange;
        return {
          date: `${date}~`,
          stock: runningStock,
          inQty: week.inQty,
          outQty: week.outQty,
          adjustQty: week.adjustQty,
        };
      });
    } else {
      // --- 日単位集計 ---
      const dailyMap = new Map<
        string,
        { inQty: number; outQty: number; adjustQty: number; netChange: number }
      >();

      for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = formatDateKey(d);
        dailyMap.set(key, { inQty: 0, outQty: 0, adjustQty: 0, netChange: 0 });
      }

      for (const tx of part.stockTransactions) {
        const d = new Date(tx.createdAt);
        const key = formatDateKey(d);
        const day = dailyMap.get(key);
        if (!day) continue;

        if (tx.type === "IN") {
          day.inQty += tx.quantity;
          day.netChange += tx.quantity;
        } else if (tx.type === "OUT") {
          day.outQty += tx.quantity;
          day.netChange -= tx.quantity;
        } else if (tx.type === "ADJUST") {
          day.adjustQty += tx.quantity;
        }
      }

      const entries = Array.from(dailyMap.entries());
      const totalNetChange = entries.reduce((sum, [, v]) => sum + v.netChange, 0);
      let runningStock = part.stock - totalNetChange;

      trendMap[part.id] = entries.map(([date, day]) => {
        runningStock += day.netChange;
        return {
          date,
          stock: runningStock,
          inQty: day.inQty,
          outQty: day.outQty,
          adjustQty: day.adjustQty,
        };
      });
    }
  }

  return { parts, trendMap };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { period: rawPeriod } = await searchParams;
  const validPeriods: Period[] = ["7d", "30d", "90d", "1y"];
  const period: Period = validPeriods.includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : "30d";

  const {
    totalParts,
    totalStock,
    totalStockValue,
    todayTransactions,
    lowStockParts,
    recentTransactions,
    pendingOrdersCount,
  } = await getDashboardData();

  const stockTrendData = await getStockTrendData(period);
  const { parts: partOptions, trendMap: partTrendMap } =
    await getPartStockTrendData(period);

  const granularityLabel = periodGranularityLabel(period);
  const title = periodTitle(period);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="ダッシュボード"
        userEmail={session.user?.email}
        activePage="dashboard"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本日の入出庫
              </CardTitle>
              <Activity className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{todayTransactions}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                承認待ち発注
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendingOrdersCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Stock Trend Chart */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              在庫推移（{title}）
            </CardTitle>
            <div className="flex items-center gap-2">
              <PeriodSelector current={period} />
              <Link href="/stock">
                <Button variant="ghost" size="sm">
                  入出庫履歴
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <StockTrendChart data={stockTrendData} periodLabel={granularityLabel} />
          </CardContent>
        </Card>

        {/* Per-Part Stock Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              部品別 在庫推移（{title}）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PartStockChart parts={partOptions} trendMap={partTrendMap} periodLabel={granularityLabel} />
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground">
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
                        <span className="text-xs font-mono text-muted-foreground mr-2">
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
                <p className="text-sm text-muted-foreground">
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
                            : tx.type === "OUT"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                            }`}
                        >
                          {tx.type === "IN" ? "入庫" : tx.type === "OUT" ? "出庫" : "調整"}
                        </span>
                        <div>
                          <span className="text-sm font-medium">
                            {tx.part.name}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ×{tx.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {tx.user.name ?? tx.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Link href="/parts/new">
            <Card className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <Package className="h-6 w-6 text-blue-500" />
                <span className="font-medium">部品を登録する</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/stock/new">
            <Card className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <ArrowLeftRight className="h-6 w-6 text-green-500" />
                <span className="font-medium">入出庫を登録する</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/users/new">
            <Card className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <Activity className="h-6 w-6 text-purple-500" />
                <span className="font-medium">ユーザーを追加する</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/orders/new">
            <Card className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <ShoppingCart className="h-6 w-6 text-orange-500" />
                <span className="font-medium">発注を作成する</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
