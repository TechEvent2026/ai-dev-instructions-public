import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { Pagination } from "@/app/stock/pagination";
import { InventoryList } from "./inventory-list";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

const SORT_FIELDS: Record<string, string> = {
  code: "code",
  name: "name",
  price: "price",
  stock: "stock",
};

function buildWhere(q: string, filter: string): Prisma.PartWhereInput {
  const conditions: Prisma.PartWhereInput[] = [];

  if (q) {
    conditions.push({
      OR: [
        { code: { contains: q } },
        { name: { contains: q } },
      ],
    });
  }

  if (filter === "low") {
    conditions.push({ stock: { gt: 0, lte: 100 } });
  } else if (filter === "out") {
    conditions.push({ stock: { lte: 0 } });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

async function getInventoryData(
  page: number,
  q: string,
  sort: string,
  order: string,
  filter: string
) {
  const where = buildWhere(q, filter);
  const orderByField = SORT_FIELDS[sort] ?? "code";
  const orderByDir = order === "desc" ? "desc" : "asc";

  const [parts, totalCount] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        name: true,
        price: true,
        stock: true,
        stockTransactions: {
          select: {
            type: true,
            quantity: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.part.count({ where }),
  ]);

  const inventory = parts.map((part) => {
    const lastTransaction = part.stockTransactions[0] ?? null;
    return {
      id: part.id,
      code: part.code,
      name: part.name,
      price: part.price,
      stock: part.stock,
      stockValue: part.price * part.stock,
      lastTransaction: lastTransaction
        ? {
          type: lastTransaction.type as "IN" | "OUT" | "ADJUST",
          quantity: lastTransaction.quantity,
          createdAt: lastTransaction.createdAt,
          createdAtFormatted: lastTransaction.createdAt.toLocaleDateString("ja-JP"),
        }
        : null,
    };
  });

  // Summary aggregates (across ALL parts, not filtered)
  const totalStockAgg = await prisma.part.aggregate({
    _sum: { stock: true },
  });
  const allParts = await prisma.part.findMany({
    select: { price: true, stock: true },
  });
  const totalStockValue = allParts.reduce(
    (sum, p) => sum + p.price * p.stock,
    0
  );
  const totalPartsCount = await prisma.part.count();

  return {
    inventory,
    totalCount,
    totalPartsCount,
    totalStock: totalStockAgg._sum.stock ?? 0,
    totalStockValue,
  };
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string; order?: string; filter?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const q = params.q || "";
  const sort = params.sort || "code";
  const order = params.order || "asc";
  const filter = params.filter || "";

  const { inventory, totalCount, totalPartsCount, totalStock, totalStockValue } =
    await getInventoryData(currentPage, q, sort, order, filter);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const paginationParams: Record<string, string> = {};
  if (q) paginationParams.q = q;
  if (sort && sort !== "code") paginationParams.sort = sort;
  if (order && order !== "asc") paginationParams.order = order;
  if (filter) paginationParams.filter = filter;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="在庫一覧"
        userEmail={session.user?.email}
        activePage="inventory"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg shadow px-4 py-3">
            <p className="text-sm text-muted-foreground">登録部品数</p>
            <p className="text-2xl font-bold">{totalPartsCount}</p>
          </div>
          <div className="bg-card rounded-lg shadow px-4 py-3">
            <p className="text-sm text-muted-foreground">総在庫数</p>
            <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-lg shadow px-4 py-3">
            <p className="text-sm text-muted-foreground">在庫総額</p>
            <p className="text-2xl font-bold">
              ¥{totalStockValue.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            在庫一覧
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              （{q || filter ? `${totalCount}件 該当` : `全${totalCount}件`}）
            </span>
          </h2>
        </div>

        <SearchFilterBar
          basePath="/inventory"
          sortOptions={[
            { value: "code", label: "部品コード" },
            { value: "name", label: "部品名" },
            { value: "price", label: "単価" },
            { value: "stock", label: "在庫数" },
          ]}
          filterOptions={[
            { value: "low", label: "在庫少（100以下）" },
            { value: "out", label: "在庫切れ" },
          ]}
          filterLabel="在庫"
        />

        <InventoryList items={inventory} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/inventory"
          extraParams={paginationParams}
        />
      </main>
    </div>
  );
}
