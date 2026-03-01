import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">部品管理システム</h1>
          <p className="text-muted-foreground text-lg">
            ようこそ、{session?.user?.name ?? session?.user?.email} さん
          </p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>部品マスタ管理</CardTitle>
              <CardDescription>
                部品の登録・編集・削除・検索を行います
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/parts">
                <Button className="w-full">部品マスタを開く</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
