import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();

  if (!session) return null;

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg">
            部品管理システム
          </Link>
          <Link
            href="/parts"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            部品マスタ
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.user?.name ?? session.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              ログアウト
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
