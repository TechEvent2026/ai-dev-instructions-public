"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SortOption {
  value: string;
  label: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface SearchFilterBarProps {
  basePath: string;
  sortOptions: SortOption[];
  filterOptions?: FilterOption[];
  filterLabel?: string;
}

export function SearchFilterBar({
  basePath,
  sortOptions,
  filterOptions,
  filterLabel = "フィルタ",
}: SearchFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? sortOptions[0]?.value ?? "";
  const order = searchParams.get("order") ?? "asc";
  const filter = searchParams.get("filter") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset to page 1 on any filter/search change
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`${basePath}?${params.toString()}`);
      });
    },
    [basePath, router, searchParams]
  );

  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="コード・名前で検索..."
          defaultValue={q}
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ q: (e.target as HTMLInputElement).value });
            }
          }}
          onBlur={(e) => {
            if (e.target.value !== q) {
              updateParams({ q: e.target.value });
            }
          }}
        />
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => updateParams({ order: order === "asc" ? "desc" : "asc" })}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground"
          title={order === "asc" ? "昇順" : "降順"}
        >
          {order === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* Filter */}
      {filterOptions && filterOptions.length > 0 && (
        <select
          value={filter}
          onChange={(e) => updateParams({ filter: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">{filterLabel}: すべて</option>
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {isPending && (
        <div className="flex items-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        </div>
      )}
    </div>
  );
}
