"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPart, updatePart, deletePart } from "./actions";

type Category = {
  id: string;
  name: string;
};

type Part = {
  id: string;
  partNumber: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: Category | null;
  quantity: number;
  price: number;
};

export function PartsTable({
  initialParts,
  categories,
}: {
  initialParts: Part[];
  categories: Category[];
}) {
  const [parts, setParts] = useState(initialParts);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParts = parts.filter(
    (part) =>
      part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (part.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (part.category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  async function handleCreate(formData: FormData) {
    setError(null);
    const result = await createPart(formData);
    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "入力内容にエラーがあります。");
      return;
    }
    setIsCreateOpen(false);
    // Refresh the page to get updated data
    window.location.reload();
  }

  async function handleUpdate(formData: FormData) {
    if (!editingPart) return;
    setError(null);
    const result = await updatePart(editingPart.id, formData);
    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "入力内容にエラーがあります。");
      return;
    }
    setIsEditOpen(false);
    setEditingPart(null);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("この部品を削除してもよろしいですか？")) return;
    await deletePart(id);
    setParts(parts.filter((p) => p.id !== id));
  }

  function PartForm({
    part,
    onSubmit,
  }: {
    part?: Part | null;
    onSubmit: (formData: FormData) => Promise<void>;
  }) {
    return (
      <form action={onSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="partNumber">部品番号 *</Label>
            <Input
              id="partNumber"
              name="partNumber"
              defaultValue={part?.partNumber ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">部品名 *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={part?.name ?? ""}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">説明</Label>
          <Input
            id="description"
            name="description"
            defaultValue={part?.description ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryId">カテゴリ</Label>
          <Select name="categoryId" defaultValue={part?.categoryId ?? ""}>
            <SelectTrigger>
              <SelectValue placeholder="カテゴリを選択" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">在庫数</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              defaultValue={part?.quantity ?? 0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">単価（円）</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={part?.price ?? 0}
            />
          </div>
        </div>

        <Button type="submit" className="w-full">
          {part ? "更新" : "登録"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="部品番号、名前、カテゴリで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); setError(null); }}>
          <DialogTrigger asChild>
            <Button>+ 新規登録</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>部品を新規登録</DialogTitle>
            </DialogHeader>
            <PartForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>部品番号</TableHead>
              <TableHead>部品名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>説明</TableHead>
              <TableHead className="text-right">在庫数</TableHead>
              <TableHead className="text-right">単価（円）</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {searchQuery ? "検索結果がありません" : "部品が登録されていません"}
                </TableCell>
              </TableRow>
            ) : (
              filteredParts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-mono font-medium">
                    {part.partNumber}
                  </TableCell>
                  <TableCell>{part.name}</TableCell>
                  <TableCell>
                    {part.category ? (
                      <Badge variant="secondary">{part.category.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {part.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">{part.quantity}</TableCell>
                  <TableCell className="text-right">
                    ¥{part.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog
                        open={isEditOpen && editingPart?.id === part.id}
                        onOpenChange={(open) => {
                          setIsEditOpen(open);
                          if (!open) setEditingPart(null);
                          setError(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPart(part)}
                          >
                            編集
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>部品を編集</DialogTitle>
                          </DialogHeader>
                          <PartForm part={editingPart} onSubmit={handleUpdate} />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(part.id)}
                      >
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        全 {filteredParts.length} 件
        {searchQuery && ` （${parts.length} 件中）`}
      </p>
    </div>
  );
}
