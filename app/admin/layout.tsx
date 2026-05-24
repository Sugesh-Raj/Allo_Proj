import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LogOut, LayoutDashboard, ShoppingBag, Truck } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get("auth_token")?.value;
  const user = token ? await verifyJWT(token) : null;

  // Additional double-check validation (middleware should have already handled this)
  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Admin specific header */}
      <header className="sticky top-0 z-50 w-full bg-slate-900 text-white border-b border-slate-850 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/admin" className="flex items-center gap-2">
              <span className="h-6 w-6 rounded bg-indigo-650 flex items-center justify-center text-white font-bold text-xs">
                A
              </span>
              <span className="font-bold text-sm tracking-tight text-white">
                Allo <span className="text-indigo-400 font-medium">Earth</span>
              </span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-900 uppercase tracking-wider">
                Control Portal
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-4 text-xs font-semibold">
              <Link href="/admin" className="text-slate-350 hover:text-white flex items-center gap-1 transition">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Management Console
              </Link>
              <Link href="/admin/shipping" className="text-slate-350 hover:text-white flex items-center gap-1 transition">
                <Truck className="h-3.5 w-3.5" />
                Global shipping queue
              </Link>
              <Link href="/" className="text-slate-350 hover:text-white flex items-center gap-1 transition">
                <ShoppingBag className="h-3.5 w-3.5" />
                Storefront view
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-bold text-white text-[11px]">{user.name}</span>
              <span className="text-[9px] text-indigo-300 uppercase tracking-wider">System Administrator</span>
            </div>
            {/* Simple logout trigger form since this is server component */}
            <form action="/api/auth/logout" method="POST" className="m-0">
              <button
                type="submit"
                className="p-1.5 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-200 border border-slate-700/60 hover:border-red-900 transition"
                title="De-authenticate Session"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-grow">{children}</main>
      
      <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-850">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-[10px] gap-2">
          <span>&copy; {new Date().getFullYear()} Allo Earth Admin Control Desk. Authorized personnel only.</span>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Encrypted Session (SHA-256 Auth Cookies Enabled)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
