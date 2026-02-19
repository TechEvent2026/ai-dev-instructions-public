"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { deletePart } from "./actions";

interface Part {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

export function PartsList({ initialParts }: { initialParts: Part[] }) {
  const router = useRouter();
  const [parts, setParts] = useState(initialParts);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("この部品を削除してもよろしいですか?")) {
      return;
    }

    setDeletingId(id);
    try {
      await deletePart(id);
      setParts(parts.filter((part) => part.id !== id));
    } catch (error) {
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  if (parts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-500 mb-4">登録されている部品がありません</p>
        <Link href="/parts/new">
          <Button>最初の部品を登録</Button>
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
              部品コード
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              部品名
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              説明
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              価格
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              在庫
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {parts.map((part) => (
            <tr key={part.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {part.code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {part.name}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {part.description || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ¥{part.price.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {part.stock}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <Link href={`/parts/edit/${part.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(part.id)}
                    disabled={deletingId === part.id}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
