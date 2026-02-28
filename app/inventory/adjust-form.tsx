"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adjustStock } from "@/app/stock/actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AdjustFormProps {
  part: {
    id: string;
    code: string;
    name: string;
    stock: number;
  };
}

export function AdjustForm({ part }: AdjustFormProps) {
  const [actualStock, setActualStock] = useState<string>("");

  const parsedActual = parseInt(actualStock, 10);
  const isValid = !isNaN(parsedActual) && parsedActual >= 0;
  const diff = isValid ? parsedActual - part.stock : null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/inventory">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            在庫一覧に戻る
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>在庫調整</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-md border bg-muted p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">部品コード</span>
                <p className="font-mono font-medium">{part.code}</p>
              </div>
              <div>
                <span className="text-muted-foreground">部品名</span>
                <p className="font-medium">{part.name}</p>
              </div>
              <div className="col-span-2 mt-2">
                <span className="text-muted-foreground">システム在庫数</span>
                <p className="text-2xl font-bold">{part.stock.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <form action={adjustStock}>
            <input type="hidden" name="partId" value={part.id} />

            <div className="space-y-4">
              <div>
                <Label htmlFor="actualStock">実棚数</Label>
                <Input
                  id="actualStock"
                  name="actualStock"
                  type="number"
                  min="0"
                  placeholder="実際の在庫数を入力"
                  value={actualStock}
                  onChange={(e) => setActualStock(e.target.value)}
                  required
                />
              </div>

              {diff !== null && (
                <div
                  className={`rounded-md border p-3 ${diff > 0
                      ? "border-green-200 bg-green-50"
                      : diff < 0
                        ? "border-red-200 bg-red-50"
                        : "border-border bg-muted"
                    }`}
                >
                  <p className="text-sm text-muted-foreground">差分プレビュー</p>
                  <p
                    className={`text-lg font-bold ${diff > 0
                        ? "text-green-700"
                        : diff < 0
                          ? "text-red-700"
                          : "text-muted-foreground"
                      }`}
                  >
                    {diff > 0
                      ? `+${diff}（増加）`
                      : diff < 0
                        ? `${diff}（減少）`
                        : "差分なし"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {part.stock.toLocaleString()} → {parsedActual.toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="note">備考（任意）</Label>
                <Input
                  id="note"
                  name="note"
                  type="text"
                  placeholder="棚卸しによる調整など"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!isValid || diff === 0}
              >
                在庫を調整する
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
