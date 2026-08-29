// Jobhunt middleware — role-based route guards (AUTH-03)
// Per directive: worker cannot open /employer/*; redirect to own home; unauth → /login
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;
    const role = (req as any).nextauth?.token?.role as string | undefined;
    if (!role) return NextResponse.redirect(new URL("/login", req.url));

    const isEmployerArea = path.startsWith("/employer");
    const isAdminArea = path.startsWith("/admin");
    const isWorkerArea = path.startsWith("/home") || path.startsWith("/profile") || path.startsWith("/applications") || path === "/jobs" || path.startsWith("/jobs/") || path.startsWith("/onboarding");

    if (isEmployerArea && role !== "employer" && role !== "admin") return NextResponse.redirect(new URL("/home", req.url));
    if (isAdminArea && role !== "admin") {
      return NextResponse.redirect(new URL(role === "employer" ? "/employer/dashboard" : "/home", req.url));
    }
    if (isWorkerArea && role !== "worker" && role !== "admin") {
      return NextResponse.redirect(new URL(role === "employer" ? "/employer/dashboard" : "/admin", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: [
    "/home/:path*", "/profile/:path*", "/applications/:path*",
    "/jobs/:path*", "/onboarding/:path*",
    "/employer/:path*", "/admin/:path*", "/verify/:path*",
  ],
};
