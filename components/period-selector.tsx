"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
export { type Period, periodTitle, periodGranularityLabel } from "@/lib/period";
import type { Period } from "@/lib/period";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7日" },
  { value: "30d", label: "30日" },
  { value: "90d", label: "90日" },
  { value: "1y", label: "年間" },
];

export function PeriodSelector({ current }: { current: Period }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(period: Period) {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "30d") {
      params.delete("period");
    } else {
      params.set("period", period);
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }

  return (
    <div className="flex gap-1">
      {PERIOD_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={current === opt.value ? "default" : "outline"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => handleSelect(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}


