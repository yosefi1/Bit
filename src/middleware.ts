import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Route-level access control:
 *   - /admin/*       requires ADMIN role
 *   - /dashboard/*   requires any signed-in user
 *   - /login         is public
 *   - everything else passes through (API routes do their own checks)
 */
export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin")) {
      if (!token || token.role !== "ADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = token ? "/dashboard" : "/login";
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public routes
        if (
          pathname === "/login" ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/uploads")
        ) {
          return true;
        }
        return !!token;
      },
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    /*
     * Match all routes except:
     *   - Next.js internals (/_next, /favicon.ico, etc.)
     *   - public file uploads (/uploads/*)
     *   - public API auth routes
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads|api/auth).*)",
  ],
};
