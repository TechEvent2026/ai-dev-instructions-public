"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPart, updatePart } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Part {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
}

interface PartFormProps {
  part?: Part;
}

export function PartForm({ part }: PartFormProps) {
  const isEditing = !!part;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Link href="/parts">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <CardTitle>{isEditing ? "部品情報の編集" : "新規部品登録"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form
          action={
            isEditing
              ? updatePart.bind(null, part.id)
              : createPart
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="code">部品コード *</Label>
            <Input
              id="code"
              name="code"
              defaultValue={part?.code}
              required
              placeholder="例: PART-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">部品名 *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={part?.name}
              required
              placeholder="例: ボルト M6x20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Input
              id="description"
              name="description"
              defaultValue={part?.description || ""}
              placeholder="部品の詳細説明"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">価格 (円) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={part?.price}
                required
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">在庫数 *</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                defaultValue={part?.stock}
                required
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Link href="/parts">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit">
              {isEditing ? "更新" : "登録"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
