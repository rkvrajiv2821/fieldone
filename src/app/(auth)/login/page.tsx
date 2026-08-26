// src/app/(auth)/login/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your GZFieldOne account",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">GZFieldOne</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to manage your leads and follow-ups</p>
        </div>

        {/* Login Card — Suspense wraps LoginForm because it uses useSearchParams */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Suspense fallback={
            <div className="space-y-5">
              <div>
                <div className="h-5 w-32 bg-white/10 rounded mb-4" />
                <div className="h-4 w-48 bg-white/5 rounded" />
              </div>
              <div className="h-11 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-11 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-11 bg-blue-600/50 rounded-lg animate-pulse" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} GZFieldOne. All rights reserved.
        </p>
      </div>
    </div>
  );
}