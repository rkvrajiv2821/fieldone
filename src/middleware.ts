// src/middleware.ts
// Uses NextAuth v5 middleware — lightweight, no bcryptjs in Edge Runtime

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Local mirror of the Prisma `Role` enum — middleware runs in the Edge runtime,
// which can't load @prisma/client (Node-only), so we can't import it here.
const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MANAGER: "MANAGER",
} as const;
type Role = (typeof Role)[keyof typeof Role];

// Minimal NextAuth config for middleware — NO bcryptjs, NO prisma
// Only handles session reading from JWT, not credential validation
const { auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [], // providers not needed in middleware
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user.id ?? "") as string;
        token.role = (user as any).role;
        token.isActive = (user as any).isActive;
        token.canViewAllLeads = (user as any).canViewAllLeads;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.isActive = token.isActive as boolean;
        session.user.canViewAllLeads = token.canViewAllLeads as boolean;
      }
      return session;
    },
  },
});

const SUPER_ADMIN_ROUTES = ["/super-admin"];
const AUTH_ROUTES = ["/login"];

export default auth((req: any) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (isLoggedIn) {
      const dest = session.user.role === Role.SUPER_ADMIN ? "/super-admin" : "/dashboard";
      return NextResponse.redirect(new URL(dest, nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session.user.isActive)
    return NextResponse.redirect(new URL("/login?error=AccountDisabled", nextUrl));

  if (SUPER_ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (pathname === "/") {
    const dest = session.user.role === Role.SUPER_ADMIN ? "/super-admin" : "/dashboard";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};