// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

// Force Node.js runtime — bcryptjs requires Node crypto, not Edge
export const runtime = "nodejs";

export const { GET, POST } = handlers;