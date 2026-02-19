import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PartForm } from "../../part-form";

async function getPart(id: string) {
  const part = await prisma.part.findUnique({
    where: { id },
  });

  if (!part) {
    notFound();
  }

  return part;
}

export default async function EditPartPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const part = await getPart(id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">部品編集</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PartForm part={part} />
      </main>
    </div>
  );
}
