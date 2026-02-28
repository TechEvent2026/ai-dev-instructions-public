import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PartForm } from "../part-form";

export default async function NewPartPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-foreground">部品登録</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PartForm />
      </main>
    </div>
  );
}
