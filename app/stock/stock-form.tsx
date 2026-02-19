"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStockTransaction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Part {
  id: string;
  code: string;
  name: string;
  stock: number;
}

interface StockFormProps {
  parts: Part[];
}

export function StockForm({ parts }: StockFormProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Link href="/stock">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <CardTitle>入出庫登録</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form action={createStockTransaction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="partId">部品 *</Label>
            <Select name="partId" required>
              <SelectTrigger>
                <SelectValue placeholder="部品を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.code} - {part.name}（在庫: {part.stock}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">入出庫タイプ *</Label>
            <Select name="type" required>
              <SelectTrigger>
                <SelectValue placeholder="タイプを選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">入庫</SelectItem>
                <SelectItem value="OUT">出庫</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">数量 *</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              required
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">備考</Label>
            <Input
              id="note"
              name="note"
              placeholder="入出庫の理由やメモ"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Link href="/stock">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit">登録</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
