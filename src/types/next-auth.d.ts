// src/types/next-auth.d.ts
// Extend NextAuth types with custom fields

import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    isActive: boolean;
    canViewAllLeads: boolean;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      isActive: boolean;
      canViewAllLeads: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isActive: boolean;
    canViewAllLeads: boolean;
  }
}
