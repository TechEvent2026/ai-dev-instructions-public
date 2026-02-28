import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  extraParams?: Record<string, string>;
}

function buildHref(page: number, extraParams?: Record<string, string>) {
  const params = new URLSearchParams(extraParams);
  params.set("page", String(page));
  return `/orders?${params.toString()}`;
}

export function Pagination({ currentPage, totalPages, extraParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-1">
      <Link href={currentPage > 1 ? buildHref(currentPage - 1, extraParams) : "#"} aria-disabled={currentPage <= 1}>
        <Button variant="outline" size="sm" disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </Link>
      {pages.map((page, index) =>
        page === "..." ? (
          <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">...</span>
        ) : (
          <Link key={page} href={buildHref(page, extraParams)}>
            <Button variant={page === currentPage ? "default" : "outline"} size="sm" className="min-w-[36px]">
              {page}
            </Button>
          </Link>
        )
      )}
      <Link href={currentPage < totalPages ? buildHref(currentPage + 1, extraParams) : "#"} aria-disabled={currentPage >= totalPages}>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
