import { auth } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth routes — always allow
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // API routes — pass through, auth handled inside each route via getUserId()
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Dashboard pages — require session
  const dashboardPaths = ["/dashboard", "/generate", "/applications", "/profiles", "/analytics", "/settings"];
  if (dashboardPaths.some((p) => pathname.startsWith(p))) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/((?!auth/).*)",
    "/dashboard/:path*",
    "/generate/:path*",
    "/applications/:path*",
    "/profiles/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
