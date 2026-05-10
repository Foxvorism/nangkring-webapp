import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  const isAdminPage = request.nextUrl.pathname.startsWith("/admin");

  // Jika mencoba akses dashboard admin tanpa token
  if (isAdminPage && !isLoginPage && !token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Jika sudah login tapi malah mau ke halaman login lagi
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

// Hanya jalankan middleware ini pada rute admin
export const config = {
  matcher: "/admin/:path*",
};
