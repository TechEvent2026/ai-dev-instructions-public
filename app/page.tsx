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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Package,
  ArrowLeftRight,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Boxes,
  DollarSign,
  Activity,
  BarChart3,
  ShoppingCart,
  Plus,
  Users,
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
    <TooltipProvider>
      <div className="min-h-screen bg-muted/40">
        <AppHeader
          title="ダッシュボード"
          userEmail={session.user?.email}
          activePage="dashboard"
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-bl-full" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  登録部品数
                </CardTitle>
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">{totalParts}</p>
                <p className="text-xs text-muted-foreground mt-1">マスタ登録済み</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-bl-full" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  総在庫数
                </CardTitle>
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">
                  {totalStock.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">全部品の合計</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-bl-full" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  在庫総額
                </CardTitle>
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">
                  ¥{totalStockValue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">評価額</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-bl-full" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  本日の入出庫
                </CardTitle>
                <div className="rounded-lg bg-violet-500/10 p-2">
                  <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">{todayTransactions}</p>
                <p className="text-xs text-muted-foreground mt-1">本日の取引件数</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-bl-full" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  承認待ち発注
                </CardTitle>
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold tracking-tight">{pendingOrdersCount}</p>
                  {pendingOrdersCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      要対応
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">未処理の発注</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section with Tabs */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    在庫推移グラフ
                  </CardTitle>
                  <CardDescription className="mt-1">
                    期間: {title}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <PeriodSelector current={period} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="overview" className="flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    全体在庫
                  </TabsTrigger>
                  <TabsTrigger value="parts" className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    部品別
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-0">
                  <StockTrendChart data={stockTrendData} periodLabel={granularityLabel} />
                </TabsContent>
                <TabsContent value="parts" className="space-y-0">
                  <PartStockChart parts={partOptions} trendMap={partTrendMap} periodLabel={granularityLabel} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Low Stock & Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Alert */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    在庫アラート
                  </CardTitle>
                  <CardDescription className="mt-1">
                    在庫100個以下の部品
                  </CardDescription>
                </div>
                <Link href="/parts">
                  <Button variant="outline" size="sm" className="gap-1">
                    すべて表示
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {lowStockParts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Boxes className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">在庫が少ない部品はありません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockParts.map((part) => {
                      const percentage = Math.min((part.stock / 100) * 100, 100);
                      return (
                        <div key={part.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline" className="shrink-0 font-mono text-[10px] px-1.5">
                                {part.code}
                              </Badge>
                              <span className="text-sm font-medium truncate">{part.name}</span>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={part.stock <= 10 ? "destructive" : "secondary"}
                                  className={
                                    part.stock <= 10
                                      ? ""
                                      : part.stock <= 50
                                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-100"
                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100"
                                  }
                                >
                                  {part.stock}個
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {part.stock <= 10
                                  ? "在庫が非常に少ないです"
                                  : part.stock <= 50
                                    ? "在庫が少なくなっています"
                                    : "在庫に注意が必要です"}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Progress
                            value={percentage}
                            className="h-1.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    最近の入出庫
                  </CardTitle>
                  <CardDescription className="mt-1">
                    直近の取引履歴
                  </CardDescription>
                </div>
                <Link href="/stock">
                  <Button variant="outline" size="sm" className="gap-1">
                    すべて表示
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {recentTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ArrowLeftRight className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">入出庫履歴はありません</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">種別</TableHead>
                        <TableHead>部品名</TableHead>
                        <TableHead className="text-right w-16">数量</TableHead>
                        <TableHead className="text-right w-24">担当 / 日付</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <Badge
                              variant={
                                tx.type === "IN"
                                  ? "default"
                                  : tx.type === "OUT"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className={
                                tx.type === "IN"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100"
                                  : tx.type === "OUT"
                                    ? ""
                                    : ""
                              }
                            >
                              {tx.type === "IN" ? "入庫" : tx.type === "OUT" ? "出庫" : "調整"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {tx.part.name}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {tx.type === "IN" ? "+" : tx.type === "OUT" ? "-" : ""}
                            {tx.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-xs text-muted-foreground">
                              {tx.user.name ?? tx.user.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString("ja-JP")}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              クイックアクション
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/parts/new">
                <Card className="group hover:border-blue-500/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-blue-500/10 p-2.5 group-hover:bg-blue-500/20 transition-colors">
                      <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">部品を登録する</p>
                      <p className="text-xs text-muted-foreground">マスタに新規追加</p>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/stock/new">
                <Card className="group hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-emerald-500/10 p-2.5 group-hover:bg-emerald-500/20 transition-colors">
                      <ArrowLeftRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">入出庫を登録する</p>
                      <p className="text-xs text-muted-foreground">在庫の変動を記録</p>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/users/new">
                <Card className="group hover:border-violet-500/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-violet-500/10 p-2.5 group-hover:bg-violet-500/20 transition-colors">
                      <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">ユーザーを追加する</p>
                      <p className="text-xs text-muted-foreground">新しいメンバーを招待</p>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/orders/new">
                <Card className="group hover:border-orange-500/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-orange-500/10 p-2.5 group-hover:bg-orange-500/20 transition-colors">
                      <ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">発注を作成する</p>
                      <p className="text-xs text-muted-foreground">新規発注を登録</p>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
