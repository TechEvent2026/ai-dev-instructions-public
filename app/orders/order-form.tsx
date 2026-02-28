"use client";

import { useState } from "react";
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
import { ArrowLeft, Plus, Trash2, Send, Save } from "lucide-react";
import Link from "next/link";
import { createOrder, updateOrder } from "./actions";

interface Part {
  id: string;
  code: string;
  name: string;
  price: number;
}

interface OrderItem {
  partId: string;
  quantity: number;
  unitPrice: number;
}

interface ExistingOrder {
  id: string;
  note: string | null;
  items: {
    partId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface OrderFormProps {
  parts: Part[];
  order?: ExistingOrder;
}

export function OrderForm({ parts, order }: OrderFormProps) {
  const isEditing = !!order;

  const [items, setItems] = useState<OrderItem[]>(
    order?.items ?? [{ partId: "", quantity: 1, unitPrice: 0 }]
  );
  const [note, setNote] = useState(order?.note ?? "");
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, { partId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    if (field === "partId") {
      const part = parts.find((p) => p.id === value);
      newItems[index] = {
        ...newItems[index],
        partId: value as string,
        unitPrice: part?.price ?? 0,
      };
    } else if (field === "quantity") {
      newItems[index] = { ...newItems[index], quantity: Number(value) || 0 };
    } else if (field === "unitPrice") {
      newItems[index] = { ...newItems[index], unitPrice: Number(value) || 0 };
    }
    setItems(newItems);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const handleSubmit = async (submitForApproval: boolean) => {
    setSubmitting(true);
    try {
      const payload = {
        note: note || undefined,
        items: items.filter((item) => item.partId),
        submit: submitForApproval,
      };

      if (isEditing) {
        await updateOrder(order.id, payload);
      } else {
        await createOrder(payload);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "エラーが発生しました");
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <CardTitle>
            {isEditing ? "発注依頼の編集" : "新規発注依頼"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">明細</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1.5 h-4 w-4" />
              行追加
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-end rounded-md border p-3"
              >
                <div className="col-span-5">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground mb-1 block">部品</Label>
                  )}
                  <Select
                    value={item.partId}
                    onValueChange={(v) => updateItem(index, "partId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="部品を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.code} - {part.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground mb-1 block">数量</Label>
                  )}
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground mb-1 block">単価</Label>
                  )}
                  <Input
                    type="number"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, "unitPrice", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2 text-right">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground mb-1 block">小計</Label>
                  )}
                  <p className="text-sm font-medium py-2">
                    ¥{(item.quantity * item.unitPrice).toLocaleString()}
                  </p>
                </div>
                <div className="col-span-1 text-center">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex justify-end">
            <div className="rounded-md bg-muted px-6 py-3 text-right">
              <span className="text-sm text-muted-foreground mr-4">合計金額</span>
              <span className="text-xl font-bold">
                ¥{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="note">備考</Label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="備考・特記事項"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/orders">
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
          >
            <Save className="mr-1.5 h-4 w-4" />
            下書き保存
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
          >
            <Send className="mr-1.5 h-4 w-4" />
            承認申請
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
