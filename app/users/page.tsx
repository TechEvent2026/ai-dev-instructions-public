import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { UsersList } from "./users-list";

async function getUsers() {
  return await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export default async function UsersPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const users = await getUsers();

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="ユーザー管理" userEmail={session.user?.email} activePage="users" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">ユーザー一覧</h2>
          </div>
          <Link href="/users/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </Link>
        </div>

        <UsersList initialUsers={users} />
      </main>
    </div>
  );
}
