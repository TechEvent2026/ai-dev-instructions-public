import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut, LayoutDashboard, Package, ArrowLeftRight, Users, ClipboardList, ShoppingCart } from "lucide-react";
import { signOut } from "@/lib/auth";

type ActivePage = "dashboard" | "parts" | "inventory" | "stock" | "orders" | "users";

interface AppHeaderProps {
  title: string;
  userEmail?: string | null;
  activePage?: ActivePage;
}

const navItems: { page: ActivePage; href: string; label: string; icon: React.ReactNode }[] = [
  { page: "dashboard", href: "/", label: "ダッシュボード", icon: <LayoutDashboard className="mr-1.5 h-4 w-4" /> },
  { page: "parts", href: "/parts", label: "部品マスタ", icon: <Package className="mr-1.5 h-4 w-4" /> },
  { page: "inventory", href: "/inventory", label: "在庫一覧", icon: <ClipboardList className="mr-1.5 h-4 w-4" /> },
  { page: "stock", href: "/stock", label: "入出庫", icon: <ArrowLeftRight className="mr-1.5 h-4 w-4" /> },
  { page: "orders", href: "/orders", label: "発注管理", icon: <ShoppingCart className="mr-1.5 h-4 w-4" /> },
  { page: "users", href: "/users", label: "ユーザー管理", icon: <Users className="mr-1.5 h-4 w-4" /> },
];

export function AppHeader({ title, userEmail, activePage }: AppHeaderProps) {
  return (
    <header className="bg-background shadow border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="mr-1.5 h-4 w-4" />
                ログアウト
              </Button>
            </form>
          </div>
        </div>
        <nav className="mt-3 flex gap-1">
          {navItems.map((item) => (
            <Link key={item.page} href={item.href}>
              <Button
                variant={activePage === item.page ? "default" : "ghost"}
                size="sm"
              >
                {item.icon}
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
