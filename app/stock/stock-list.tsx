import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StockTransaction {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  createdAt: Date;
  part: {
    code: string;
    name: string;
  };
  user: {
    name: string | null;
    email: string | null;
  };
}

export function StockList({
  transactions,
}: {
  transactions: StockTransaction[];
}) {
  if (transactions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-500 mb-4">入出庫履歴がありません</p>
        <Link href="/stock/new">
          <Button>最初の入出庫を登録</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              日時
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              部品コード
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              部品名
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              タイプ
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              数量
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              備考
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作者
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(tx.createdAt).toLocaleString("ja-JP")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {tx.part.code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {tx.part.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tx.type === "IN"
                    ? "bg-green-100 text-green-800"
                    : tx.type === "OUT"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                    }`}
                >
                  {tx.type === "IN" ? "入庫" : tx.type === "OUT" ? "出庫" : "調整"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {tx.quantity}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {tx.note || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {tx.user.name || tx.user.email || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
