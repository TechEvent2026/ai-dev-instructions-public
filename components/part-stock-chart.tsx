"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type PartStockDailyData = {
  date: string;
  stock: number;
  inQty: number;
  outQty: number;
  adjustQty: number;
};

export type PartOption = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
};

export type PartStockTrendMap = Record<string, PartStockDailyData[]>;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-popover text-popover-foreground shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function PartStockChart({
  parts,
  trendMap,
  periodLabel = "日別",
}: {
  parts: PartOption[];
  trendMap: PartStockTrendMap;
  periodLabel?: string;
}) {
  const [selectedPartId, setSelectedPartId] = useState(parts[0]?.id ?? "");

  const selectedPart = parts.find((p) => p.id === selectedPartId);
  const data = trendMap[selectedPartId] ?? [];

  if (parts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p className="text-sm">部品が登録されていません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Part selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          部品を選択:
        </label>
        <Select value={selectedPartId} onValueChange={setSelectedPartId}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="部品を選択してください" />
          </SelectTrigger>
          <SelectContent>
            {parts.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{p.code}</span>
                  <span>-</span>
                  <span>{p.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 ml-1">
                    {p.currentStock.toLocaleString()}個
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <p className="text-sm">この部品の入出庫データはありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stock line chart */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              在庫数の推移 —{" "}
              <span className="text-primary font-semibold">
                {selectedPart?.code} {selectedPart?.name}
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  className="text-muted-foreground"
                  axisLine={{ className: "stroke-border" }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  className="text-muted-foreground"
                  axisLine={{ className: "stroke-border" }}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="stock"
                  name="在庫数"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily in/out bar chart */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              {periodLabel} 入出庫・調整
            </h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={data}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  className="text-muted-foreground"
                  axisLine={{ className: "stroke-border" }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  className="text-muted-foreground"
                  axisLine={{ className: "stroke-border" }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="inQty"
                  name="入庫"
                  fill="hsl(var(--chart-2))"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="outQty"
                  name="出庫"
                  fill="hsl(var(--chart-3))"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="adjustQty"
                  name="調整"
                  fill="hsl(var(--chart-4))"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
