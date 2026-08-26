// src/lib/auth.ts
// NextAuth v5 configuration

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // user.id can be undefined in NextAuth types — cast safely
        token.id = (user.id ?? "") as string;
        token.role = (user as any).role as Role;
        token.isActive = (user as any).isActive as boolean;
        token.canViewAllLeads = (user as any).canViewAllLeads as boolean;
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
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true, name: true, email: true, password: true,
            role: true, isActive: true, canViewAllLeads: true, phone: true,
          },
        });

        if (!user) throw new Error("No account found with this email");
        if (!user.isActive) throw new Error("Your account has been deactivated. Contact admin.");

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) throw new Error("Invalid password");

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          canViewAllLeads: user.canViewAllLeads,
        };
      },
    }),
  ],
});