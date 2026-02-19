import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { AdjustForm } from "../../adjust-form";

export default async function AdjustPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const part = await prisma.part.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      stock: true,
    },
  });

  if (!part) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        title="在庫調整"
        userEmail={session.user?.email}
        activePage="inventory"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdjustForm part={part} />
      </main>
    </div>
  );
}
