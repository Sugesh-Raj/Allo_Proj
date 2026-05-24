import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Ignore static assets, api routes (except those we want middleware to guard), next internal files
  if (
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path.startsWith("/favicon.ico") ||
    path.startsWith("/images/") ||
    path.startsWith("/api/cron") || // Excluded from user auth middleware (secured by header instead)
    path.startsWith("/api/auth")    // Public auth endpoints
  ) {
    return NextResponse.next();
  }

  // Retrieve user session token
  const token = req.cookies.get("auth_token")?.value;
  const user = token ? await verifyJWT(token) : null;

  // 1. Guard for API Routes (excluding login, register, public products, public warehouses, and cron)
  if (path.startsWith("/api/admin")) {
    if (!user || user.role !== "ADMIN") {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized access. Admin role required." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. Guard for Pages
  const isAdminPath = path.startsWith("/admin");
  const isAuthPage = path === "/login" || path === "/register" || path === "/admin/login";

  if (isAuthPage) {
    if (user) {
      // User already logged in, redirect them away from auth forms
      if (user.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      } else {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
    return NextResponse.next();
  }

  // User is not authenticated
  if (!user) {
    if (isAdminPath) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    } else {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // User is authenticated but tries to access Admin route with normal USER role
  if (isAdminPath && user.role !== "ADMIN") {
    // Show forbidden screen or redirect to home catalog
    return NextResponse.redirect(new URL("/", req.url));
  }

  // User is authenticated, proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/cron (cron triggers)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
