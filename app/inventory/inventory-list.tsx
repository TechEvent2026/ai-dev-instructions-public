import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  stockValue: number;
  lastTransaction: {
    type: "IN" | "OUT" | "ADJUST";
    quantity: number;
    createdAtFormatted: string;
  } | null;
}

export function InventoryList({ items }: { items: InventoryItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">部品が登録されていません</p>
      </Card>
    );
  }

  return (
    <div className="bg-card shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              部品コード
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              部品名
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              単価
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              在庫数
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              在庫金額
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              最終入出庫
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-foreground">
                {item.code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {item.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right">
                ¥{item.price.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span
                  className={`text-sm font-bold ${item.stock <= 0
                    ? "text-red-600"
                    : item.stock <= 10
                      ? "text-red-500"
                      : item.stock <= 50
                        ? "text-orange-500"
                        : item.stock <= 100
                          ? "text-yellow-600"
                          : "text-foreground"
                    }`}
                >
                  {item.stock.toLocaleString()}
                </span>
                {item.stock <= 100 && (
                  <span className="ml-1 text-xs text-orange-500">⚠</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right">
                ¥{item.stockValue.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {item.lastTransaction ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${item.lastTransaction.type === "IN"
                        ? "bg-green-100 text-green-800"
                        : item.lastTransaction.type === "OUT"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                        }`}
                    >
                      {item.lastTransaction.type === "IN" ? "入庫" : item.lastTransaction.type === "OUT" ? "出庫" : "調整"}
                    </span>
                    <span className="text-xs">
                      ×{item.lastTransaction.quantity}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.lastTransaction.createdAtFormatted}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Link href={`/inventory/adjust/${item.id}`}>
                  <Button variant="outline" size="sm">
                    調整
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
