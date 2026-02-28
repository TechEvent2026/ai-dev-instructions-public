import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { PartsList } from "./parts-list";
import { Pagination } from "./pagination";
import { CsvToolbar } from "./csv-toolbar";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 10;

const SORT_FIELDS: Record<string, string> = {
  code: "code",
  name: "name",
  price: "price",
  stock: "stock",
  createdAt: "createdAt",
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

async function getParts(
  page: number,
  q: string,
  sort: string,
  order: string,
  filter: string
) {
  const where = buildWhere(q, filter);
  const orderByField = SORT_FIELDS[sort] ?? "createdAt";
  const orderByDir = order === "asc" ? "asc" : "desc";

  const [parts, totalCount] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.part.count({ where }),
  ]);

  return { parts, totalCount };
}

export default async function PartsPage({
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
  const sort = params.sort || "createdAt";
  const order = params.order || "desc";
  const filter = params.filter || "";

  const { parts, totalCount } = await getParts(currentPage, q, sort, order, filter);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Build query string for pagination (preserve search/sort/filter)
  const paginationParams: Record<string, string> = {};
  if (q) paginationParams.q = q;
  if (sort && sort !== "createdAt") paginationParams.sort = sort;
  if (order && order !== "desc") paginationParams.order = order;
  if (filter) paginationParams.filter = filter;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="部品マスタ管理" userEmail={session.user?.email} activePage="parts" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground">
            部品一覧
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              （{q || filter ? `${totalCount}件 該当` : `全${totalCount}件`}）
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <CsvToolbar />
            <Link href="/parts/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規登録
              </Button>
            </Link>
          </div>
        </div>

        <SearchFilterBar
          basePath="/parts"
          sortOptions={[
            { value: "code", label: "部品コード" },
            { value: "name", label: "部品名" },
            { value: "price", label: "価格" },
            { value: "stock", label: "在庫数" },
            { value: "createdAt", label: "登録日" },
          ]}
          filterOptions={[
            { value: "low", label: "在庫少（100以下）" },
            { value: "out", label: "在庫切れ" },
          ]}
          filterLabel="在庫"
        />

        <PartsList key={`${currentPage}-${q}-${sort}-${order}-${filter}`} initialParts={parts} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          extraParams={paginationParams}
        />
      </main>
    </div>
  );
}
