"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, ShoppingBag, ShieldAlert, Globe } from "lucide-react";

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role: "USER" | "ADMIN";
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-indigo-200">
              A
            </span>
            <span className="font-semibold text-lg tracking-tight text-slate-900">
              Allo <span className="text-indigo-600 font-medium">Earth</span>
            </span>
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50 uppercase tracking-wider">
              Health Log
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Storefront
            </Link>
            {user?.role === "ADMIN" && (
              <>
                <Link
                  href="/orders"
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Live Order Queue
                </Link>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* User Session Area */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-800">{user.name}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  {user.role === "ADMIN" && (
                    <span className="px-1 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium text-[8px]">
                      ADMIN
                    </span>
                  )}
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-medium text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
