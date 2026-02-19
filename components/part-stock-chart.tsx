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
    <div className="bg-white rounded-lg border shadow-lg p-3 text-sm">
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
}: {
  parts: PartOption[];
  trendMap: PartStockTrendMap;
}) {
  const [selectedPartId, setSelectedPartId] = useState(parts[0]?.id ?? "");

  const selectedPart = parts.find((p) => p.id === selectedPartId);
  const data = trendMap[selectedPartId] ?? [];

  if (parts.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">部品が登録されていません。</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Part selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="part-select"
          className="text-sm font-medium text-gray-600 whitespace-nowrap"
        >
          部品を選択:
        </label>
        <select
          id="part-select"
          value={selectedPartId}
          onChange={(e) => setSelectedPartId(e.target.value)}
          className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name} （現在: {p.currentStock.toLocaleString()}個）
            </option>
          ))}
        </select>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">
          この部品の入出庫データはありません。
        </p>
      ) : (
        <div className="space-y-4">
          {/* Stock line chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              在庫数の推移 —{" "}
              <span className="text-indigo-600">
                {selectedPart?.code} {selectedPart?.name}
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="stock"
                  name="在庫数"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily in/out bar chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              日別 入出庫・調整
            </h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={data}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="inQty"
                  name="入庫"
                  fill="#22c55e"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="outQty"
                  name="出庫"
                  fill="#ef4444"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="adjustQty"
                  name="調整"
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
