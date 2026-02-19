import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";
import { signOut } from "@/lib/auth";
import { PartsList } from "./parts-list";

async function getParts() {
  return await prisma.part.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export default async function PartsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const parts = await getParts();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">部品マスタ管理</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">部品一覧</h2>
          <Link href="/parts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </Link>
        </div>

        <PartsList initialParts={parts} />
      </main>
    </div>
  );
}
