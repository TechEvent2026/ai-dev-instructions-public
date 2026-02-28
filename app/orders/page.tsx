import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { OrdersList } from "./orders-list";
import { Pagination } from "./pagination";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 10;

const SORT_FIELDS: Record<string, string> = {
  orderNumber: "orderNumber",
  totalAmount: "totalAmount",
  createdAt: "createdAt",
};

function buildWhere(q: string, filter: string): Prisma.OrderWhereInput {
  const conditions: Prisma.OrderWhereInput[] = [];

  if (q) {
    conditions.push({
      OR: [
        { orderNumber: { contains: q } },
        { requestedBy: { name: { contains: q } } },
        { requestedBy: { email: { contains: q } } },
      ],
    });
  }

  if (filter && ["DRAFT", "PENDING", "APPROVED", "REJECTED", "ORDERED", "RECEIVED"].includes(filter)) {
    conditions.push({ status: filter });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string; order?: string; filter?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const q = params.q || "";
  const sort = params.sort || "createdAt";
  const order = params.order || "desc";
  const filter = params.filter || "";

  const where = buildWhere(q, filter);
  const orderByField = SORT_FIELDS[sort] ?? "createdAt";
  const orderByDir = order === "asc" ? "asc" : "desc";

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        requestedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const formattedOrders = orders.map((o) => ({
    ...o,
    createdAtFormatted: o.createdAt.toLocaleDateString("ja-JP"),
  }));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const paginationParams: Record<string, string> = {};
  if (q) paginationParams.q = q;
  if (sort && sort !== "createdAt") paginationParams.sort = sort;
  if (order && order !== "desc") paginationParams.order = order;
  if (filter) paginationParams.filter = filter;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="発注管理" userEmail={session.user?.email} activePage="orders" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground">
            発注一覧
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              （{q || filter ? `${totalCount}件 該当` : `全${totalCount}件`}）
            </span>
          </h2>
          <Link href="/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規発注
            </Button>
          </Link>
        </div>

        <SearchFilterBar
          basePath="/orders"
          sortOptions={[
            { value: "orderNumber", label: "発注番号" },
            { value: "totalAmount", label: "合計金額" },
            { value: "createdAt", label: "作成日" },
          ]}
          filterOptions={[
            { value: "DRAFT", label: "下書き" },
            { value: "PENDING", label: "承認待ち" },
            { value: "APPROVED", label: "承認済み" },
            { value: "REJECTED", label: "却下" },
            { value: "ORDERED", label: "発注済み" },
            { value: "RECEIVED", label: "納品済み" },
          ]}
          filterLabel="ステータス"
        />

        <OrdersList
          key={`${currentPage}-${q}-${sort}-${order}-${filter}`}
          initialOrders={formattedOrders}
          currentUserId={session.user.id}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          extraParams={paginationParams}
        />
      </main>
    </div>
  );
}
