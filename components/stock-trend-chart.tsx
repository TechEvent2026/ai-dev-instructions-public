"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type StockChartDailyData = {
  date: string;
  inQty: number;
  outQty: number;
  adjustQty: number;
  totalStock: number;
};

function CustomTooltip({
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

export function StockTrendChart({ data, periodLabel = "日別" }: { data: StockChartDailyData[]; periodLabel?: string }) {
  return (
    <div className="space-y-6">
      {/* Total stock area chart */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">総在庫数の推移</h4>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="totalStock"
              name="総在庫数"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#gradStock)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Daily in/out/adjust bar chart */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">{periodLabel} 入出庫・調整数</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="square"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="inQty" name="入庫" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="outQty" name="出庫" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="adjustQty" name="調整" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
