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
import { createUser, updateUser } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface UserFormProps {
  user?: User;
}

export function UserForm({ user }: UserFormProps) {
  const isEditing = !!user;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <CardTitle>
            {isEditing ? "ユーザー情報の編集" : "新規ユーザー登録"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form
          action={
            isEditing ? updateUser.bind(null, user.id) : createUser
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">名前 *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user?.name || ""}
              required
              placeholder="例: 山田 太郎"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user?.email || ""}
              required
              placeholder="例: user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              パスワード {isEditing ? "(変更する場合のみ入力)" : "*"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required={!isEditing}
              minLength={6}
              placeholder={
                isEditing
                  ? "変更しない場合は空欄"
                  : "6文字以上で入力"
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">ロール *</Label>
            <Select name="role" defaultValue={user?.role || ROLES.USER}>
              <SelectTrigger>
                <SelectValue placeholder="ロールを選択" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Link href="/users">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit">{isEditing ? "更新" : "登録"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
