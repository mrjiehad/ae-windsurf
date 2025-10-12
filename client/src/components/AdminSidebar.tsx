import { Link, useLocation } from "wouter";
import { Package, Trophy, Tag, ShoppingCart, Settings, LogOut, Image, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AdminSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/admin/packages", icon: Package, label: "Packages" },
    { href: "/admin/rankings", icon: Trophy, label: "Rankings" },
    { href: "/admin/gallery", icon: Image, label: "Gallery" },
    { href: "/admin/hero", icon: Sparkles, label: "Hero Section" },
    { href: "/admin/coupons", icon: Tag, label: "Coupons" },
    { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-900 border-r border-yellow-500/20 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-yellow-500/20">
        <Link href="/" data-testid="link-home">
          <h1 className="text-3xl font-bebas text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer">
            AECOIN STORE
          </h1>
        </Link>
        <p className="text-xs text-zinc-500 mt-1">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? "bg-yellow-400 text-black"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-yellow-400"
                }`}
                data-testid={`link-admin-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-rajdhani font-semibold">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-yellow-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full border-2 border-yellow-400 bg-yellow-400 flex items-center justify-center text-black font-bold">
            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
            <p className="text-xs text-yellow-400">Administrator</p>
          </div>
        </div>
        <Button
          onClick={() => logout()}
          variant="outline"
          className="w-full border-yellow-500/20 text-zinc-400 hover:bg-yellow-400 hover:text-black"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
